// Fonctions utilitaires.
function randomDelay(min, max) {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min) {
        throw new RangeError('Délais invalides.');
    }
    return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
}

function timestamp() {
    return new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
}

function cleanNumber(number) {
    return String(number ?? '').replace(/\D/g, '');
}

function isValidNumber(number) {
    return /^\d{8,15}$/.test(cleanNumber(number));
}

function formatWhatsAppId(number) {
    const clean = cleanNumber(number);
    if (!isValidNumber(clean)) throw new TypeError('Numéro de téléphone invalide.');
    return `${clean}@c.us`;
}

function sleep(ms, signal) {
    if (signal?.aborted) return Promise.resolve();
    return new Promise(resolve => {
        const timer = setTimeout(done, ms);
        function done() {
            clearTimeout(timer);
            signal?.removeEventListener('abort', done);
            resolve();
        }
        signal?.addEventListener('abort', done, { once: true });
    });
}

module.exports = { randomDelay, timestamp, cleanNumber, isValidNumber, formatWhatsAppId, sleep };
