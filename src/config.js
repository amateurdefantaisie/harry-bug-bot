// Configuration centralisée et validation stricte.
require('dotenv').config();
const { cleanNumber } = require('./utils');

function intEnv(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
    const raw = process.env[name];
    if (raw === undefined || raw.trim() === '') return fallback;
    if (!/^[0-9]+$/.test(raw.trim())) {
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < min || value > max) {
        throw new Error(`Variable ${name} : valeur attendue entre ${min} et ${max}.`);
    }
    return value;
}

function numberList(value, variableName) {
    return (value || '').split(',').map(v => v.trim()).filter(Boolean).map(raw => {
        if (!/^\+?[\d\s()-]+$/.test(raw)) {
            throw new Error(`Variable ${variableName} : numéro invalide. Utilisez le format international avec chiffres uniquement, ou +, espaces, parenthèses et tirets.`);
        }
        const number = cleanNumber(raw);
        if (!/^\d{8,15}$/.test(number)) {
            throw new Error(`Variable ${variableName} : chaque numéro doit contenir 8 à 15 chiffres.`);
        }
        return number;
    });
}

const prefix = process.env.PREFIX || '!';
if (prefix.length > 3 || /\s/.test(prefix)) throw new Error('PREFIX doit contenir 1 à 3 caractères sans espace.');

const delayMin = intEnv('DELAY_MIN', 2, { min: 1, max: 60 });
const delayMax = intEnv('DELAY_MAX', 6, { min: 1, max: 60 });
if (delayMin > delayMax) throw new Error('DELAY_MIN ne peut pas dépasser DELAY_MAX.');

const targetNumbers = [...new Set([
    ...numberList(process.env.TARGET_NUMBERS, 'TARGET_NUMBERS'),
    ...numberList(process.env.TARGET_NUMBER, 'TARGET_NUMBER'),
])];
const adminNumbers = [...new Set(numberList(process.env.ADMIN_NUMBERS, 'ADMIN_NUMBERS'))];

function messageLimitEnv() {
    const raw = process.env.MAX_MESSAGES_PER_RUN;
    if (raw === undefined || raw.trim() === '') return 5;
    if (!/^[0-9]+$/.test(raw.trim())) {
        console.warn('[CONFIG] MAX_MESSAGES_PER_RUN invalide ; valeur sûre 5 utilisée.');
        return 5;
    }
    const value = Number(raw.trim());
    if (!Number.isSafeInteger(value) || value < 1) {
        console.warn('[CONFIG] MAX_MESSAGES_PER_RUN doit être positif ; valeur sûre 5 utilisée.');
        return 5;
    }
    if (value > 5) {
        console.warn('[CONFIG] MAX_MESSAGES_PER_RUN dépasse le plafond autorisé ; valeur ramenée à 5.');
        return 5;
    }
    return value;
}

const config = {
    prefix,
    target: { number: targetNumbers[0] || null, allowedNumbers: targetNumbers },
    admins: adminNumbers,
    delay: { min: delayMin, max: delayMax },
    // La quantité est demandée à chaque test ; ce réglage fixe le plafond autorisé.
    maxMessagesPerRun: messageLimitEnv(),
    defaultMessage: (process.env.DEFAULT_MESSAGE || 'Harry Bug Bot — message de test autorisé').slice(0, 500),
    sessionName: (process.env.SESSION_NAME || 'harry-bug-session').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'harry-bug-session',
    puppeteerNoSandbox: process.env.PUPPETEER_NO_SANDBOX === 'true',
};


module.exports = config;
