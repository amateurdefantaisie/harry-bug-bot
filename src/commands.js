// Gestionnaire de commandes avec assistant de test en plusieurs étapes.
const config = require('./config');
const { getClient } = require('./client');
const { startBug, stopBug, getStats } = require('./bugger');
const { timestamp, cleanNumber } = require('./utils');

// Une configuration en attente par administrateur ; aucun état n'est partagé entre expéditeurs.
const pendingTests = new Map();

function showHelp() {
    return [
        'HARRY BUG BOT — commandes administrateur',
        `${config.prefix}help — afficher cette aide`,
        `${config.prefix}test — démarrer l’assistant de test (cible, quantité, message, confirmation)`,
        `${config.prefix}cancel — annuler l’assistant de test`,
        `${config.prefix}stop — arrêter le test en cours`,
        `${config.prefix}stats — statistiques du dernier test`,
        `${config.prefix}status — état de la connexion`,
        `${config.prefix}cible — afficher le nombre de cibles autorisées`,
        '',
        'Les commandes sont réservées aux numéros de ADMIN_NUMBERS.',
        `Le nombre est choisi à chaque test, dans la limite configurée de 1 à ${config.maxMessagesPerRun} messages.`,
        'Les cibles doivent être listées dans TARGET_NUMBERS et avoir consenti au test.',
    ].join('\n');
}

async function handleWizardReply(msg, sender, body, pending) {
    if (body.toLowerCase() === `${config.prefix}cancel`) {
        pendingTests.delete(sender);
        await msg.reply('Assistant de test annulé.');
        return true;
    }

    if (pending.step === 'target') {
        const number = cleanNumber(body);
        if (!/^\d{8,15}$/.test(number)) {
            await msg.reply('Numéro invalide. Saisissez le numéro international avec chiffres uniquement, ou !cancel pour annuler.');
            return true;
        }
        if (!config.target.allowedNumbers.includes(number)) {
            await msg.reply('Cible refusée : ce numéro ne figure pas dans TARGET_NUMBERS. Ajoutez-le uniquement après avoir obtenu son consentement.');
            return true;
        }
        pending.target = number;
        pending.step = 'count';
        await msg.reply(`Combien de messages de test ? Choisissez un entier de 1 à ${config.maxMessagesPerRun}.`);
        return true;
    }

    if (pending.step === 'count') {
        if (!/^\d+$/.test(body)) {
            await msg.reply(`Saisissez un nombre entier entre 1 et ${config.maxMessagesPerRun}, ou !cancel pour annuler.`);
            return true;
        }
        const count = Number(body);
        if (!Number.isSafeInteger(count) || count < 1 || count > config.maxMessagesPerRun) {
            await msg.reply(`Quantité refusée. Choisissez un nombre de 1 à ${config.maxMessagesPerRun}.`);
            return true;
        }
        pending.count = count;
        pending.step = 'message';
        await msg.reply(`Saisissez le texte à envoyer (500 caractères maximum), ou tapez DEFAULT pour utiliser le message configuré. Tapez !cancel pour annuler.`);
        return true;
    }

    if (pending.step === 'message') {
        const message = body.toLowerCase() === 'default' ? config.defaultMessage : body;
        if (!message.trim() || message.length > 500) {
            await msg.reply('Le message doit contenir entre 1 et 500 caractères. Réessayez ou tapez !cancel.');
            return true;
        }
        pending.message = message.trim();
        pending.step = 'confirm';
        await msg.reply([
            'Récapitulatif du test :',
            `Cible : +${pending.target}`,
            `Nombre de messages : ${pending.count}`,
            `Texte : ${pending.message}`,
            '',
            `Répondez OUI pour lancer le test, ou NON pour annuler. (${config.prefix}cancel annule également.)`,
        ].join('\n'));
        return true;
    }

    if (pending.step === 'confirm') {
        const answer = body.toLowerCase();
        if (['non', 'non merci', 'no', 'n'].includes(answer)) {
            pendingTests.delete(sender);
            await msg.reply('Test annulé. Aucun message envoyé.');
            return true;
        }
        if (!['oui', 'yes', 'y'].includes(answer)) {
            await msg.reply('Répondez OUI pour confirmer ou NON pour annuler.');
            return true;
        }
        pendingTests.delete(sender);
        await msg.reply('Test confirmé. Démarrage…');
        await startBug(pending.target, {
            message: pending.message,
            maxMessages: pending.count,
        });
        const s = getStats();
        await msg.reply(`Test terminé. Envoyés : ${s.sent}. Échecs : ${s.failed}. Durée : ${s.elapsed}.`);
        return true;
    }

    pendingTests.delete(sender);
    await msg.reply('Assistant réinitialisé. Envoyez !test pour recommencer.');
    return true;
}

async function handleMessage(msg) {
    if (!msg || typeof msg.body !== 'string' || !msg.from) return;

    const body = msg.body.trim();
    const sender = cleanNumber(String(msg.author || msg.from).split('@')[0]);
    if (!config.admins.includes(sender)) {
        if (body.startsWith(config.prefix)) {
            console.warn(`[${timestamp()}] Commande ignorée : expéditeur non autorisé.`);
        }
        return;
    }
    if (msg.from.endsWith('@g.us')) {
        if (body.startsWith(config.prefix)) {
            await msg.reply('Commandes administratives désactivées dans les groupes.');
        }
        return;
    }

    const pending = pendingTests.get(sender);
    if (pending && !body.startsWith(config.prefix)) {
        try {
            await handleWizardReply(msg, sender, body, pending);
        } catch (err) {
            console.error(`[${timestamp()}] Erreur assistant de test : ${err.stack || err.message}`);
            await msg.reply(`Opération refusée ou échouée : ${err.message}`);
        }
        return;
    }

    if (!body.startsWith(config.prefix)) return;
    const parts = body.slice(config.prefix.length).trim().split(/\s+/);
    const commandName = (parts.shift() || '').toLowerCase();
    const args = parts;
    let response;

    try {
        switch (commandName) {
            case 'help':
                response = showHelp();
                break;
            case 'test':
                if (args.length) {
                    response = `Utilisation : ${config.prefix}test — le bot vous demandera ensuite la cible, la quantité et le message.`;
                    break;
                }
                if (getStats().running) {
                    response = 'Un test est déjà en cours. Utilisez !stop pour demander son arrêt.';
                    break;
                }
                pendingTests.set(sender, { step: 'target' });
                response = 'Assistant de test : saisissez le numéro international de la cible autorisée. Tapez !cancel pour annuler.';
                break;
            case 'cancel':
                pendingTests.delete(sender);
                response = 'Assistant de test annulé.';
                break;
            case 'bug':
            case 'bugconfig':
                response = 'Cette ancienne commande est désactivée. Utilisez !test pour configurer un test étape par étape.';
                break;
            case 'stop':
                response = stopBug() ? 'Arrêt demandé.' : 'Aucun test en cours.';
                break;
            case 'stats': {
                const s = getStats();
                response = [
                    'Statistiques du test',
                    `Envoyés : ${s.sent}`,
                    `Échecs : ${s.failed}`,
                    `Durée : ${s.elapsed || '0s'}`,
                    `État : ${s.running ? 'en cours' : 'arrêté'}`,
                    s.lastError ? `Dernière erreur : ${s.lastError}` : null,
                ].filter(Boolean).join('\n');
                break;
            }
            case 'status': {
                const client = getClient();
                response = [
                    `Connexion : ${client?.info ? 'connecté' : 'déconnecté'}`,
                    `Compte : ${client?.info?.pushname || 'indisponible'}`,
                    `Test en cours : ${getStats().running ? 'oui' : 'non'}`,
                ].join('\n');
                break;
            }
            case 'cible':
                response = `Nombre de cibles autorisées configurées : ${config.target.allowedNumbers.length}. Les numéros ne sont pas affichés dans le chat.`;
                break;
            default:
                response = `Commande inconnue. Tapez ${config.prefix}help.`;
        }
        if (response) await msg.reply(response);
    } catch (err) {
        console.error(`[${timestamp()}] Erreur commande ${commandName}: ${err.stack || err.message}`);
        await msg.reply(`Opération refusée ou échouée : ${err.message}`);
    }
}

module.exports = { handleMessage };
