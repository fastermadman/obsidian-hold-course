'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSettings } = require('./_bootstrap.js');

// #10: device-local settings moved out of data.json into their own file.
// normalizeSettings is what turns whatever was on disk (a real file, a
// legacy inline block, or nothing) into a complete settings object.

test('null / garbage → all defaults', () => {
  assert.deepEqual(normalizeSettings(null, 1.0), { einkMode: false, mobileScale: 1.0, timeFormat: 'auto' });
  assert.deepEqual(normalizeSettings(undefined, 1.1), { einkMode: false, mobileScale: 1.1, timeFormat: 'auto' });
  assert.deepEqual(normalizeSettings('nonsense', 1.0), { einkMode: false, mobileScale: 1.0, timeFormat: 'auto' });
});

test('legacy inline block is carried over verbatim', () => {
  assert.deepEqual(
    normalizeSettings({ einkMode: true, mobileScale: 1.3 }, 1.0),
    { einkMode: true, mobileScale: 1.3, timeFormat: 'auto' },
  );
});

test('missing mobileScale falls back to the device default', () => {
  assert.deepEqual(
    normalizeSettings({ einkMode: true }, 1.1),
    { einkMode: true, mobileScale: 1.1, timeFormat: 'auto' },
  );
});

test('timeFormat only accepts auto/12h/24h, otherwise falls back to auto', () => {
  assert.equal(normalizeSettings({ timeFormat: '24h' }, 1.0).timeFormat, '24h');
  assert.equal(normalizeSettings({ timeFormat: '12h' }, 1.0).timeFormat, '12h');
  assert.equal(normalizeSettings({ timeFormat: 'nonsense' }, 1.0).timeFormat, 'auto');
  assert.equal(normalizeSettings({}, 1.0).timeFormat, 'auto');
});

test('einkMode is coerced to a real boolean', () => {
  assert.equal(normalizeSettings({ einkMode: 1 }, 1.0).einkMode, false);
  assert.equal(normalizeSettings({}, 1.0).einkMode, false);
  assert.equal(normalizeSettings({ einkMode: true }, 1.0).einkMode, true);
});
