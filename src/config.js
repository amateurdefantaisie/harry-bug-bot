// Configuration centralisée et validation stricte.
require('dotenv').config();
const { cleanNumber } = require('./utils');

function intEnv(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
    const raw = process.env[name];
    if (raw === undefined || raw.trim() === '') return fallback;
    if (!/^\d+$/.test(raw.trim())) throw new Error(`Variable ${name} : entier positif attendu.`);
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

const config = {
    prefix,
    target: { number: targetNumbers[0] || null, allowedNumbers: targetNumbers },
    admins: adminNumbers,
    delay: { min: delayMin, max: delayMax },
    batch: {
        size: intEnv('BATCH_SIZE', 1, { min: 1, max: 5 }),
        pause: intEnv('BATCH_PAUSE', 30, { min: 10, max: 3600 }),
    },
    maxMessagesPerRun: intEnv('MAX_MESSAGES_PER_RUN', 1, { min: 1, max: 5 }),
    defaultMessage: (process.env.DEFAULT_MESSAGE || 'Harry Bug Bot — message de test autorisé').slice(0, 500),
    sessionName: (process.env.SESSION_NAME || 'harry-bug-session').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'harry-bug-session',
    puppeteerNoSandbox: process.env.PUPPETEER_NO_SANDBOX === 'true',
};

if (config.batch.size > config.maxMessagesPerRun) {
    throw new Error('BATCH_SIZE ne peut pas dépasser MAX_MESSAGES_PER_RUN.');
}

module.exports = config;
