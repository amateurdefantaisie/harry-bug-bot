// Point d’entrée : démarrage, événements et arrêt propre.
const { createClient, destroyClient, getClient } = require('./client');
const { handleMessage } = require('./commands');
const { stopBug } = require('./bugger');
const { timestamp } = require('./utils');

let shuttingDown = false;

async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[${timestamp()}] Arrêt demandé (${signal}).`);
    stopBug();
    try {
        const client = getClient();
        if (client) await destroyClient();
    } finally {
        process.exit(0);
    }
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', reason => {
    console.error(`[${timestamp()}] Promesse rejetée non gérée :`, reason);
});
process.on('uncaughtException', err => {
    console.error(`[${timestamp()}] Exception non gérée :`, err);
    shutdown('uncaughtException');
});

async function main() {
    const client = await createClient();
    client.on('message', msg => {
        handleMessage(msg).catch(err => console.error(`[${timestamp()}] Erreur message : ${err.message}`));
    });
}
main().catch(err => {
    console.error(`[${timestamp()}] Impossible de démarrer : ${err.stack || err.message}`);
    process.exitCode = 1;
});
