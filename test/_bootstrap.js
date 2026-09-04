'use strict';

/*
 * Makes main.js require-able outside Obsidian.
 *
 * main.js is loaded by the app itself and starts with require('obsidian'),
 * which doesn't exist on disk. Stub it in front of the module loader instead
 * of splitting the code into multiple files — Obsidian only ever loads
 * main.js, so a split would cost more than it buys.
 *
 * Covers only what module-level code touches: the names destructured at the
 * top, and the classes extended from them. Kept empty on purpose beyond
 * that — the day a test needs more than this, it isn't testing pure logic
 * anymore, and belongs on-device instead.
 */

const Module = require('node:module');
const path = require('node:path');

class Plugin {}
class ItemView {}
class PluginSettingTab {}
// No DOM here on purpose — open()/close() intentionally don't call the real
// onOpen()/onClose() (those touch this.contentEl, a real DOM element in
// Obsidian). Tests that need "was a modal shown" spy on open() itself
// instead of asserting on rendered content — see test/open-vault-note.test.js.
class Modal {
  constructor(app) { this.app = app; }
  open() {}
  close() {}
}

const stub = {
  Plugin,
  ItemView,
  PluginSettingTab,
  Modal,
  Setting: class {},
  Menu: class {},
  Notice: class { constructor(message) { this.message = message; } },
  setIcon: () => {},
  addIcon: () => {},
  MarkdownRenderer: { render: async () => {} },
  FuzzySuggestModal: class {},
};

const load = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'obsidian') return stub;
  return load.call(this, request, ...rest);
};

module.exports = require(path.join(__dirname, '..', 'main.js'));
module.exports.__obsidianStub = stub;
