// src/config.js - Configuration centralisée
require('dotenv').config();

const config = {
    // Préfixe des commandes
    prefix: process.env.PREFIX || '!',

    // Contact cible
    target: {
        number: process.env.TARGET_NUMBER || null,
    },

    // Paramètres d'envoi
    delay: {
        min: parseInt(process.env.DELAY_MIN) || 1,
        max: parseInt(process.env.DELAY_MAX) || 6,
    },

    batch: {
        size: parseInt(process.env.BATCH_SIZE) || 30,
        pause: parseInt(process.env.BATCH_PAUSE) || 8,
    },

    silent: process.env.SILENT_MODE === 'true',

    defaultMessage: process.env.DEFAULT_MESSAGE || '🔮 Harry Bug Bot - Je vais te bloqué 🥲🤲 désolé camarade',

    // Statuts du bot
    status: {
        IDLE: 'idle',
        RUNNING: 'running',
        STOPPED: 'stopped',
    },

    // Noms des sessions WhatsApp
    sessionName: 'harry-bug-session',
};

module.exports = config;