// src/bugger.js - Cœur du système d'envoi de messages (le "bug")
const config = require('./config');
const { getClient } = require('./client');
const { randomDelay, timestamp, formatWhatsAppId, sleep } = require('./utils');

let isRunning = false;
let stopRequested = false;
let stats = {
    sent: 0,
    failed: 0,
    startedAt: null,
    elapsed: '0s',
};

/**
 * Messages variés pour éviter la détection par motifs répétés
 */
const messagePool = [
    '🔮 Harry Bug Bot - Test #',
    '⚡ Bug en cours... #',
    '📡 Transmission #',
    '🔄 Pulsation #',
    '🌀 Vague #',
    '🔋 Signal #',
    '📨 Paquet #',
    '🎯 Ciblage #',
    '💫 Impact #',
    '🔥 Flux #',
];

/**
 * Envoie un message avec un contenu légèrement varié
 */
async function sendMessage(chatId, index) {
    const client = getClient();
    if (!client) return false;

    try {
        const baseMsg = messagePool[index % messagePool.length];
        const timestamp_suffix = Date.now().toString().slice(-4);
        const message = `${baseMsg}${index} [${timestamp_suffix}]`;

        await client.sendMessage(chatId, message);
        stats.sent++;
        return true;
    } catch (err) {
        stats.failed++;
        console.error(`[${timestamp()}] ❌ Échec envoi #${index} :`, err.message);
        return false;
    }
}

/**
 * Démarre la boucle d'envoi de messages
 */
async function startBug(targetNumber, customConfig = {}) {
    const chatId = formatWhatsAppId(targetNumber);
    const client = getClient();

    if (!client) {
        console.log(`[${timestamp()}] ❌ Client WhatsApp non initialisé`);
        return;
    }

    if (isRunning) {
        console.log(`[${timestamp()}] ⚠️ Le bug est déjà en cours ! Tape !stop pour arrêter.`);
        return;
    }

    // Fusionner la config par défaut avec les customisations
    const cfg = {
        delayMin: customConfig.delayMin || config.delay.min,
        delayMax: customConfig.delayMax || config.delay.max,
        batchSize: customConfig.batchSize || config.batch.size,
        batchPause: customConfig.batchPause || config.batch.pause,
        message: customConfig.message || config.defaultMessage,
    };

    // Vérifier que le contact existe / est accessible
    try {
        const contact = await client.getContactById(chatId);
        console.log(`[${timestamp()}] 🎯 Cible : ${contact.pushname || contact.name || targetNumber}`);
    } catch (err) {
        console.log(`[${timestamp()}] ⚠️ Contact introuvable, tentative d'envoi direct...`);
    }

    isRunning = true;
    stopRequested = false;
    stats.sent = 0;
    stats.failed = 0;
    stats.startedAt = new Date();

    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║        🔮 HARRY BUG BOT - LANCÉ         ║`);
    console.log(`╠══════════════════════════════════════════╣`);
    console.log(`║  Cible         : ${targetNumber.padEnd(22)}║`);
    console.log(`║  Délai         : ${String(cfg.delayMin).padEnd(2)}-${String(cfg.delayMax).padEnd(2)}s               ║`);
    console.log(`║  Salve         : ${String(cfg.batchSize).padEnd(2)} msg / ${String(cfg.batchPause).padEnd(2)}s       ║`);
    console.log(`╚══════════════════════════════════════════╝\n`);

    let globalIndex = 0;

    while (!stopRequested) {
        // Envoyer une salve de messages
        for (let i = 0; i < cfg.batchSize && !stopRequested; i++) {
            globalIndex++;
            const success = await sendMessage(chatId, globalIndex);
            
            const status = success ? '✅' : '❌';
            process.stdout.write(`\r[${timestamp()}] ${status} Message #${globalIndex} envoyé`);

            if (!stopRequested) {
                const delay = randomDelay(cfg.delayMin, cfg.delayMax);
                await sleep(delay);
            }
        }

        if (stopRequested) break;

        // Pause entre les salves
        console.log(`\n[${timestamp()}] ⏸️  Pause de ${cfg.batchPause}s (${stats.sent} envoyés, ${stats.failed} échecs)`);
        for (let i = cfg.batchPause; i > 0 && !stopRequested; i--) {
            process.stdout.write(`\r   ⏳ Prochaine salve dans ${i}s   `);
            await sleep(1000);
        }
        process.stdout.write(`\r                                 \r`);
        console.log(`[${timestamp()}] ▶️  Reprise...\n`);
    }

    // Arrêt propre
    stats.elapsed = formatElapsed(stats.startedAt);
    isRunning = false;

    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║       🔮 HARRY BUG BOT - ARRÊTÉ        ║`);
    console.log(`╠══════════════════════════════════════════╣`);
    console.log(`║  Envoyés  : ${String(stats.sent).padEnd(29)}║`);
    console.log(`║  Échecs   : ${String(stats.failed).padEnd(29)}║`);
    console.log(`║  Durée    : ${stats.elapsed.padEnd(29)}║`);
    console.log(`╚══════════════════════════════════════════╝\n`);
}

/**
 * Arrête la boucle d'envoi
 */
function stopBug() {
    if (!isRunning) {
        console.log(`[${timestamp()}] ⚠️ Aucun bug en cours.`);
        return;
    }
    stopRequested = true;
    console.log(`[${timestamp()}] 🛑 Arrêt demandé...`);
}

/**
 * Formate le temps écoulé
 */
function formatElapsed(start) {
    const diff = Math.floor((new Date() - start) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

/**
 * Retourne les stats actuelles
 */
function getStats() {
    return { ...stats, running: isRunning };
}

module.exports = {
    startBug,
    stopBug,
    getStats,
};