// Gestionnaire de commandes avec autorisation côté serveur.
const config = require('./config');
const { getClient } = require('./client');
const { startBug, stopBug, getStats } = require('./bugger');
const { timestamp, cleanNumber } = require('./utils');

function showHelp() {
    return [
        'HARRY BUG BOT — commandes administrateur',
        `${config.prefix}help — afficher cette aide`,
        `${config.prefix}test <numéro> [message] — envoyer un test borné à une cible autorisée`,
        `${config.prefix}stop — arrêter le test en cours`,
        `${config.prefix}stats — statistiques du dernier test`,
        `${config.prefix}status — état de la connexion`,
        `${config.prefix}cible — afficher la cible de test configurée`,
        '',
        'Les commandes sont réservées aux numéros de ADMIN_NUMBERS.',
        'Les cibles doivent être listées dans TARGET_NUMBERS. Maximum 5 messages par test.',
    ].join('\n');
}

async function handleMessage(msg) {
    if (!msg || typeof msg.body !== 'string' || !msg.from) return;
    const body = msg.body.trim();
    if (!body.startsWith(config.prefix)) return;

    const sender = cleanNumber(String(msg.author || msg.from).split('@')[0]);
    if (!config.admins.includes(sender)) {
        console.warn(`[${timestamp()}] Commande ignorée : expéditeur non autorisé.`);
        return;
    }
    if (msg.from.endsWith('@g.us')) {
        await msg.reply('Commandes administratives désactivées dans les groupes.');
        return;
    }

    const parts = body.slice(config.prefix.length).trim().split(/\s+/);
    const commandName = (parts.shift() || '').toLowerCase();
    const args = parts;
    let response;

    try {
        switch (commandName) {
            case 'help':
                response = showHelp();
                break;
            case 'test': {
                if (!args.length) {
                    response = `Utilisation : ${config.prefix}test <numéro> [message]`;
                    break;
                }
                const number = cleanNumber(args[0]);
                const message = args.slice(1).join(' ') || config.defaultMessage;
                await startBug(number, { message, maxMessages: config.maxMessagesPerRun });
                response = 'Test terminé. Utilisez la commande stats pour consulter le résultat.';
                break;
            }
            case 'bug':
            case 'bugconfig':
                response = 'Cette ancienne commande est désactivée. Utilisez !test : chaque exécution est plafonnée à 5 messages et exige une cible autorisée.';
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
                response = `Cibles autorisées configurées : ${config.target.allowedNumbers.length}. Les numéros ne sont pas affichés dans le chat.`;
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
