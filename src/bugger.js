// Envoi de tests bornés, uniquement vers une cible explicitement autorisée.
const config = require('./config');
const { getClient } = require('./client');
const { randomDelay, timestamp, formatWhatsAppId, sleep, cleanNumber } = require('./utils');

let isRunning = false;
let controller = null;
let stats = { sent: 0, failed: 0, startedAt: null, elapsed: '0s', lastError: null };

async function sendMessage(chatId, message, index) {
    const client = getClient();
    if (!client?.info) throw new Error('Client WhatsApp non connecté.');
    try {
        await client.sendMessage(chatId, message);
        stats.sent++;
        return true;
    } catch (err) {
        stats.failed++;
        stats.lastError = err.message;
        console.error(`[${timestamp()}] Échec du message de test #${index}: ${err.message}`);
        return false;
    }
}

async function startBug(targetNumber, customConfig = {}) {
    const number = cleanNumber(targetNumber);
    if (!/^\d{8,15}$/.test(number)) throw new Error('Numéro cible invalide.');
    if (!config.target.allowedNumbers.includes(number)) {
        throw new Error('Cible refusée : ajoutez ce numéro à TARGET_NUMBERS uniquement après avoir obtenu son consentement.');
    }
    if (isRunning) throw new Error('Un test est déjà en cours.');

    const client = getClient();
    if (!client?.info) throw new Error('Client WhatsApp non connecté.');

    const delayMin = customConfig.delayMin ?? config.delay.min;
    const delayMax = customConfig.delayMax ?? config.delay.max;
    const maxMessages = customConfig.maxMessages ?? config.maxMessagesPerRun;
    const message = String(customConfig.message || config.defaultMessage).trim().slice(0, 500);

    if (!Number.isInteger(delayMin) || delayMin < 1 || delayMin > 60 ||
        !Number.isInteger(delayMax) || delayMax < delayMin || delayMax > 60) {
        throw new Error('Délais invalides (1–60 secondes et minimum ≤ maximum).');
    }
    if (!Number.isInteger(maxMessages) || maxMessages < 1 || maxMessages > 5) {
        throw new Error('Un test est limité à 5 messages maximum par exécution.');
    }
    if (!message) throw new Error('Le message de test ne peut pas être vide.');

    const chatId = formatWhatsAppId(number);
    try {
        const contact = await client.getContactById(chatId);
        console.log(`[${timestamp()}] Cible autorisée : ${contact.pushname || contact.name || 'contact confirmé'}`);
    } catch {
        throw new Error('Impossible de confirmer la cible. Aucun message envoyé.');
    }

    isRunning = true;
    controller = new AbortController();
    stats = { sent: 0, failed: 0, startedAt: new Date(), elapsed: '0s', lastError: null };
    const signal = controller.signal;
    console.log(`[${timestamp()}] Test autorisé démarré (maximum ${maxMessages} message(s)).`);

    try {
        for (let index = 1; index <= maxMessages && !signal.aborted; index++) {
            const ok = await sendMessage(chatId, message, index);
            if (!ok) break;
            if (index < maxMessages && !signal.aborted) await sleep(randomDelay(delayMin, delayMax), signal);
        }
    } finally {
        stats.elapsed = formatElapsed(stats.startedAt);
        isRunning = false;
        controller = null;
        console.log(`[${timestamp()}] Test terminé : ${stats.sent} envoyé(s), ${stats.failed} échec(s), durée ${stats.elapsed}.`);
    }
}

function stopBug() {
    if (!isRunning || !controller) return false;
    controller.abort();
    return true;
}

function formatElapsed(start) {
    if (!start) return '0s';
    const seconds = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h ? `${h}h ${m}m ${s}s` : m ? `${m}m ${s}s` : `${s}s`;
}

function getStats() {
    return { ...stats, running: isRunning };
}

module.exports = { startBug, stopBug, getStats };
