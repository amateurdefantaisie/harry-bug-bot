// src/commands.js - Gestionnaire de commandes
const config = require('./config');
const { getClient } = require('./client');
const { startBug, stopBug, getStats } = require('./bugger');
const { timestamp, cleanNumber } = require('./utils');

/**
 * Liste des commandes disponibles
 */
const commands = {
    help: {
        desc: 'Affiche cette aide',
        usage: '!help',
        execute: (args, chatId) => showHelp(chatId),
    },
    bug: {
        desc: 'Démarre le bug sur le contact spécifié',
        usage: '!bug <numéro> [message]',
        execute: (args, chatId) => cmdBug(args, chatId),
    },
    bugconfig: {
        desc: 'Démarre le bug avec configuration personnalisée',
        usage: '!bugconfig <numéro> <min> <max> <batch> <pause> [message]',
        execute: (args, chatId) => cmdBugConfig(args, chatId),
    },
    stop: {
        desc: 'Arrête le bug en cours',
        usage: '!stop',
        execute: () => cmdStop(),
    },
    stats: {
        desc: 'Affiche les statistiques du dernier bug',
        usage: '!stats',
        execute: (args, chatId) => cmdStats(chatId),
    },
    status: {
        desc: 'Affiche le statut du bot',
        usage: '!status',
        execute: (args, chatId) => cmdStatus(chatId),
    },
    cible: {
        desc: 'Définit la cible par défaut depuis le .env',
        usage: '!cible',
        execute: (args, chatId) => cmdSetCible(args, chatId),
    },
};

/**
 * Affiche l'aide
 */
function showHelp(chatId) {
    const prefix = config.prefix;
    let helpText = `╔════════════════════════════════════╗\n`;
    helpText += `║    🔮 HARRY BUG BOT - COMMANDES    ║\n`;
    helpText += `╚════════════════════════════════════╝\n\n`;

    for (const [name, cmd] of Object.entries(commands)) {
        helpText += `${prefix}${name}\n`;
        helpText += `   📝 ${cmd.desc}\n`;
        helpText += `   💡 ${cmd.usage}\n\n`;
    }

    return helpText;
}

/**
 * Commande !bug <numéro> [message]
 */
async function cmdBug(args, chatId) {
    if (!args || args.length === 0) {
        // Utiliser la cible du .env
        if (config.target.number) {
            await startBug(config.target.number);
            return null;
        }
        return `❌ Utilisation : ${config.prefix}bug <numéro>\n   Exemple : ${config.prefix}bug 33612345678`;
    }

    const number = cleanNumber(args[0]);
    if (number.length < 8) {
        return `❌ Numéro invalide : "${args[0]}". Format attendu : 33612345678`;
    }

    const customMessage = args.slice(1).join(' ') || null;
    await startBug(number, { message: customMessage });
    return null;
}

/**
 * Commande !bugconfig <numéro> <min> <max> <batch> <pause> [message]
 */
async function cmdBugConfig(args, chatId) {
    if (!args || args.length < 5) {
        return `❌ Utilisation : ${config.prefix}bugconfig <numéro> <min> <max> <batch> <pause> [message]\n`
             + `   Exemple : ${config.prefix}bugconfig 33612345678 1 3 10 60 Message test`;
    }

    const number = cleanNumber(args[0]);
    const delayMin = parseInt(args[1]);
    const delayMax = parseInt(args[2]);
    const batchSize = parseInt(args[3]);
    const batchPause = parseInt(args[4]);
    const customMessage = args.slice(5).join(' ') || null;

    if (number.length < 8) return `❌ Numéro invalide`;
    if (isNaN(delayMin) || isNaN(delayMax)) return `❌ Délais invalides`;
    if (isNaN(batchSize) || batchSize < 1) return `❌ Taille de salve invalide`;
    if (isNaN(batchPause) || batchPause < 1) return `❌ Pause invalide`;

    await startBug(number, { delayMin, delayMax, batchSize, batchPause, message: customMessage });
    return null;
}

/**
 * Commande !stop
 */
function cmdStop() {
    stopBug();
    return null;
}

/**
 * Commande !stats
 */
function cmdStats(chatId) {
    const stats = getStats();
    let text = `╔════════════════════════════════════╗\n`;
    text += `║     📊 STATISTIQUES DU DERNIER BUG   ║\n`;
    text += `╚════════════════════════════════════╝\n\n`;
    text += `📨 Messages envoyés : ${stats.sent}\n`;
    text += `❌ Échecs           : ${stats.failed}\n`;
    text += `⏱️  Durée           : ${stats.elapsed || 'N/A'}\n`;
    text += `🔄 Statut          : ${stats.running ? '▶️  En cours' : '⏹️  Arrêté'}\n`;
    return text;
}

/**
 * Commande !status
 */
function cmdStatus(chatId) {
    const client = getClient();
    const stats = getStats();

    let text = `╔════════════════════════════════════╗\n`;
    text += `║     🔮 HARRY BUG BOT - STATUT      ║\n`;
    text += `╚════════════════════════════════════╝\n\n`;
    text += `📡 Connexion     : ${client?.info ? '✅ Connecté' : '❌ Déconnecté'}\n`;
    text += `👤 Compte        : ${client?.info?.pushname || 'N/A'}\n`;
    text += `📱 Numéro        : ${client?.info?.wid?.user || 'N/A'}\n`;
    text += `🔄 Bug en cours  : ${stats.running ? '▶️  Oui' : '⏹️  Non'}\n`;
    text += `📨 Envoyés       : ${stats.sent}\n`;
    text += `🎯 Cible .env    : ${config.target.number || 'Non définie'}\n`;
    return text;
}

/**
 * Commande !cible <numéro>
 */
function cmdSetCible(args, chatId) {
    if (!args || args.length === 0) {
        const current = config.target.number || 'Non définie';
        return `🎯 Cible actuelle dans .env : ${current}\n`
             + `💡 Pour utiliser la cible du .env : ${config.prefix}bug\n`
             + `   Pour changer, modifie TARGET_NUMBER dans le fichier .env`;
    }

    const number = cleanNumber(args[0]);
    if (number.length < 8) return `❌ Numéro invalide`;

    // On ne modifie que pour la session en cours (pas le .env)
    config.target.number = number;
    return `🎯 Cible temporaire définie sur ${number} (valable uniquement pour cette session)`;
}

/**
 * Traite un message entrant et exécute la commande si applicable
 */
async function handleMessage(msg) {
    const prefix = config.prefix;
    const body = msg.body.trim();

    // Vérifier si le message commence par le préfixe
    if (!body.startsWith(prefix)) return;

    const parts = body.slice(prefix.length).split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);
    const chatId = msg.from;

    // Chercher la commande
    const command = commands[commandName];
    if (!command) {
        await msg.reply(`❌ Commande inconnue. Tape ${prefix}help pour voir les commandes disponibles.`);
        return;
    }

    console.log(`[${timestamp()}] 📩 Commande reçue : ${prefix}${commandName} ${args.join(' ')}`);

    try {
        const result = await command.execute(args, chatId);
        if (result) {
            await msg.reply(result);
        }
    } catch (err) {
        console.error(`[${timestamp()}] ❌ Erreur commande ${commandName} :`, err.message);
        await msg.reply(`❌ Erreur : ${err.message}`);
    }
}

module.exports = { handleMessage, commands };