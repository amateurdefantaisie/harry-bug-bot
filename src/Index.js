// src/index.js - Point d'entrée principal du Harry Bug Bot
const { createClient, getClient } = require('./client');
const { handleMessage } = require('./commands');
const { timestamp } = require('./utils');
const config = require('./config');

/**
 * Message de bienvenue dans la console
 */
function printBanner() {
    console.log(`
╔══════════════════════════════════════════════╗
║                                              ║
║     🔮  HARRY BUG BOT  🔮                   ║
║     WhatsApp Stress Test Tool                ║
║     Version 1.0.0 - Node.js                  ║
║                                              ║
╚══════════════════════════════════════════════╝

🔐 Connexion en cours...
📝 Commandes disponibles dans WhatsApp :
   ${config.prefix}help - Affiche l'aide
   ${config.prefix}bug <numéro> - Lance le bug
   ${config.prefix}stop - Arrête le bug
   ${config.prefix}stats - Statistiques

⚠️  Ce bot est destiné à des tests de sécurité
    autorisés sur vos propres comptes uniquement.

`);
}

/**
 * Démarrage du bot
 */
async function main() {
    printBanner();

    try {
        // Créer et initialiser le client WhatsApp
        const client = await createClient();

        // Configurer l'écoute des messages entrants
        client.on('message', async (msg) => {
            await handleMessage(msg);
        });

        // Attendre que le client soit prêt
        client.on('ready', () => {
            console.log(`[${timestamp()}] ✅ Bot prêt ! En attente de commandes...`);
            console.log(`[${timestamp()}] 💡 Envoie "${config.prefix}help" dans WhatsApp pour voir les commandes`);
            
            // Afficher la cible configurée
            if (config.target.number) {
                console.log(`[${timestamp()}] 🎯 Cible par défaut : ${config.target.number}`);
                console.log(`[${timestamp()}] 🔄 Lance avec : ${config.prefix}bug`);
            } else {
                console.log(`[${timestamp()}] ⚠️  Aucune cible définie dans .env`);
                console.log(`[${timestamp()}] 📱 Utilise : ${config.prefix}bug <numéro>`);
            }
        });

        // Gérer l'arrêt propre (Ctrl+C)
        process.on('SIGINT', async () => {
            console.log(`\n[${timestamp()}] 👋 Arrêt du bot...`);
            const client = getClient();
            if (client) {
                await client.destroy();
            }
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            console.log(`\n[${timestamp()}] 👋 Arrêt du bot (SIGTERM)...`);
            const client = getClient();
            if (client) {
                await client.destroy();
            }
            process.exit(0);
        });

    } catch (err) {
        console.error(`[${timestamp()}] ❌ Erreur fatale :`, err);
        process.exit(1);
    }
}

// Lancer le bot
main();