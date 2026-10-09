// Initialisation du client WhatsApp Web.
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const readline = require('readline');
const config = require('./config');
const { timestamp, cleanNumber } = require('./utils');

let client = null;
let authMethod = null;
let shuttingDown = false;

function askQuestion(query) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(query, answer => { rl.close(); resolve(answer); }));
}

async function chooseAuthMethod() {
    if (!process.stdin.isTTY) {
        throw new Error('Un terminal interactif est requis pour la première authentification. Connectez la session une première fois dans un terminal.');
    }
    console.log('\n=== HARRY BUG BOT ===\n1. QR Code\n2. Code d’appairage\n');
    let choice = '';
    while (!['1', '2'].includes(choice)) {
        choice = (await askQuestion('Choisissez 1 ou 2 : ')).trim();
    }
    return choice === '1' ? 'qr' : 'pairing';
}

function setupQRHandler(instance) {
    instance.on('qr', qr => {
        console.log(`\n[${timestamp()}] Scannez ce QR code avec WhatsApp :\n`);
        qrcode.generate(qr, { small: true });
    });
}

async function setupPairingHandler(instance) {
    const phoneNumber = await askQuestion('Numéro du compte WhatsApp (format international, chiffres uniquement) : ');
    const number = cleanNumber(phoneNumber);
    if (!/^\d{8,15}$/.test(number)) throw new Error('Numéro invalide (8 à 15 chiffres requis).');
    if (typeof instance.requestPairingCode !== 'function') {
        throw new Error('Cette version de whatsapp-web.js ne prend pas en charge le code d’appairage.');
    }
    const code = await instance.requestPairingCode(number);
    console.log(`Code d’appairage : ${code}`);
    console.log('Saisissez ce code dans WhatsApp > Appareils liés > Lier avec un numéro de téléphone.');
}

async function createClient() {
    if (client) return client;
    authMethod = await chooseAuthMethod();
    const puppeteerArgs = ['--disable-dev-shm-usage', '--no-first-run', '--disable-gpu'];
    // N’activer --no-sandbox que sur une plateforme qui l’exige explicitement.
    if (config.puppeteerSandbox) puppeteerArgs.push('--no-sandbox', '--disable-setuid-sandbox');

    client = new Client({
        authStrategy: new LocalAuth({ clientId: config.sessionName }),
        puppeteer: { headless: true, args: puppeteerArgs },
    });

    client.on('qr', qr => {
        if (authMethod === 'qr') {
            console.log(`\n[${timestamp()}] Scannez le QR code :\n`);
            qrcode.generate(qr, { small: true });
        }
    });
    client.on('authenticated', () => console.log(`[${timestamp()}] Session authentifiée.`));
    client.on('auth_failure', message => console.error(`[${timestamp()}] Échec d’authentification : ${message}`));
    client.on('ready', () => console.log(`[${timestamp()}] Client WhatsApp prêt.`));
    client.on('disconnected', reason => console.warn(`[${timestamp()}] Client déconnecté : ${reason}`));

    await client.initialize();
    if (authMethod === 'pairing' && !client.info) {
        try {
            await setupPairingHandler(client);
        } catch (err) {
            await destroyClient().catch(() => {});
            throw err;
        }
    }
    return client;
}

function getClient() { return client; }
function getAuthMethod() { return authMethod; }

async function destroyClient() {
    if (shuttingDown) return;
    shuttingDown = true;
    const current = client;
    client = null;
    if (current) {
        try { await current.destroy(); }
        catch (err) { console.error(`[${timestamp()}] Erreur à la fermeture du client : ${err.message}`); }
    }
}

module.exports = { createClient, getClient, getAuthMethod, destroyClient };
