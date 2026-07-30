// src/utils.js - Fonctions utilitaires

/**
 * Génère un délai aléatoire entre min et max secondes
 */
function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
}

/**
 * Formate une date en horaire lisible
 */
function timestamp() {
    return new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Nettoie un numéro de téléphone (garde uniquement les chiffres)
 */
function cleanNumber(number) {
    return number.replace(/[^0-9]/g, '');
}

/**
 * Génère l'ID WhatsApp à partir d'un numéro
 */
function formatWhatsAppId(number) {
    return `${cleanNumber(number)}@c.us`;
}

/**
 * Pause asynchrone
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    randomDelay,
    timestamp,
    cleanNumber,
    formatWhatsAppId,
    sleep,
};