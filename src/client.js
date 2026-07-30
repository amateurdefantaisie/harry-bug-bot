// src/client.js - Initialisation du client WhatsApp (QR Code + Pairing Code)
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const readline = require('readline');
const config = require('./config');
const { timestamp } = require('./utils');

let client = null;
let authMethod = null;

/**
 * Crée une interface readline pour la saisie utilisateur
 */
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => rl.question(query, answer => {
        rl.close();
        resolve(answer);
    }));
}

/**
 * Demande à l'utilisateur la méthode de connexion
 */
async function chooseAuthMethod() {
    console.log('\n=== 🔮 HARRY BUG BOT ===\n');
    console.log('Choisis la méthode de connexion :');
    console.log('  1️⃣  QR Code (scanner avec WhatsApp)');
    console.log('  2️⃣  Numéro de téléphone (code de 8 caractères)\n');

    let choice;
    while (!['1', '2'].includes(choice)) {
        choice = await askQuestion('➜ Ton choix (1 ou 2) : ');
        if (!['1', '2'].includes(choice)) {
            console.log('❌ Choix invalide. Tape 1 ou 2.');
        }
    }
    return choice === '1' ? 'qr' : 'pairing';
}

/**
 * Mode QR Code - Attendre le scan du QR
 */
function setupQRHandler(clientInstance) {
    clientInstance.on('qr', (qr) => {
        console.log(`\n[${timestamp()}] 🔐 Scanne ce QR code avec ton WhatsApp :\n`);
        qrcode.generate(qr, { small: true });
        console.log('\n⏳ En attente du scan...\n');
    });
}

/**
 * Mode Pairing Code - Envoyer un code de 8 caractères à taper dans WhatsApp
 */
async function setupPairingHandler(clientInstance) {
    const phoneNumber = await askQuestion('📱 Entre ton numéro (format international, sans + ni espaces, ex: 33612345678) : ');
    const cleanNum = phoneNumber.replace(/[^0-9]/g, '');

    if (cleanNum.length < 8) {
        console.log('❌ Numéro invalide. Redémarre le bot et réessaie.');
        process.exit(1);
    }

    console.log(`\n[${timestamp()}] 🔄 Demande du code de jumelage pour ${cleanNum}...\n`);

    try {
        const pairingCode = await clientInstance.requestPairingCode(cleanNum);
        console.log(`╔══════════════════════════════════════════╗`);
        console.log(`║  🔑 Code de jumelage : ${pairingCode}     ║`);
        console.log(`╚══════════════════════════════════════════╝`);
        console.log(`\n📱 Tape ce code dans WhatsApp →`);
        console.log(`   Appareils liés → Lier un appareil →`);
        console.log(`   Lier avec un numéro de téléphone\n`);
        console.log('⏳ En attente de la confirmation...\n');
    } catch (err) {
        console.error(`❌ Erreur lors de la demande de code :`, err.message);
        process.exit(1);
    }
}

/**
 * Crée et initialise le client WhatsApp
 */
async function createClient() {
    // Demander la méthode de connexion
    authMethod = await chooseAuthMethod();

    client = new Client({
        authStrategy: new LocalAuth({
            clientId: config.sessionName,
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
            ],
        },
    });

    // Événements généraux
    client.on('loading_screen', (percent, message) => {
        console.log(`[${timestamp()}] 📦 Chargement : ${percent}% - ${message}`);
    });

    client.on('authenticated', () => {
        console.log(`[${timestamp()}] ✅ Authentifié avec succès`);
    });

    client.on('auth_failure', (msg) => {
        console.error(`[${timestamp()}] ❌ Échec d'authentification :`, msg);
    });

    client.on('ready', () => {
        console.log(`[${timestamp()}] ✅ Bot prêt ! Connecté en tant que ${client.info?.pushname || 'inconnu'}`);
    });

    client.on('disconnected', (reason) => {
        console.log(`[${timestamp()}] ⚠️ Déconnecté :`, reason);
    });

    // Configurer la méthode d'authentification choisie
    if (authMethod === 'qr') {
        setupQRHandler(client);
    }

    // Démarrer le client
    client.initialize();

    // Si mode pairing, attendre que le client soit prêt puis demander le code
    if (authMethod === 'pairing') {
        // Attendre que le client ait généré son événement (mais pas encore scanné)
        await new Promise(resolve => {
            // Si le client est déjà prêt (session existante), on ne fait rien
            client.on('ready', resolve);
            
            // Sinon, on attend un peu puis on déclenche le pairing
            setTimeout(resolve, 3000);
        });

        // Vérifier si déjà connecté (session restaurée)
        if (client.info) {
            console.log(`[${timestamp()}] ✅ Session existante restaurée !`);
            return client;
        }

        // Sinon, lancer le pairing code
        await setupPairingHandler(client);
    }

    return client;
}

/**
 * Retourne l'instance du client
 */
function getClient() {
    return client;
}

function getAuthMethod() {
    return authMethod;
}

module.exports = { createClient, getClient, getAuthMethod };