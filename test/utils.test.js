const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanNumber, isValidNumber, formatWhatsAppId, randomDelay, sleep } = require('../src/utils');

test('cleanNumber removes non-digits', () => {
    assert.equal(cleanNumber('+243 812-345-678'), '243812345678');
});

test('phone number validation enforces 8–15 digits', () => {
    assert.equal(isValidNumber('243812345678'), true);
    assert.equal(isValidNumber('123'), false);
    assert.equal(isValidNumber('12345678abc'), false);
});

test('formatWhatsAppId rejects invalid numbers', () => {
    assert.equal(formatWhatsAppId('243812345678'), '243812345678@c.us');
    assert.throws(() => formatWhatsAppId('abc'), /invalide/);
});

test('randomDelay validates bounds and returns milliseconds in range', () => {
    for (let i = 0; i < 20; i++) {
        const value = randomDelay(1, 2);
        assert.ok(value === 1000 || value === 2000);
    }
    assert.throws(() => randomDelay(3, 2), /invalide/);
});

test('sleep resolves immediately when aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await sleep(10000, controller.signal);
});
