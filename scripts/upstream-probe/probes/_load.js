'use strict';
// Loads main.js (path in HC_MAIN) outside Obsidian. Any obsidian export we did
// not list is an empty class, since newer upstream versions extend more of them.
const Module = require('node:module');
class Modal { constructor(app) { this.app = app; } open() {} close() {} }
class Notice { constructor(m) { this.message = m; } }
const known = { Modal, Notice, setIcon() {}, addIcon() {}, getIconIds: () => [], MarkdownRenderer: { render: async () => {} } };
const stub = new Proxy(known, { get: (t, k) => (k in t ? t[k] : (typeof k === 'string' ? class {} : undefined)) });
const orig = Module._load;
Module._load = function (req, ...rest) { return req === 'obsidian' ? stub : orig.call(this, req, ...rest); };
const hc = require(process.env.HC_MAIN);

// Tiny reporter: probes print PASS/FAIL lines and exit non-zero on any FAIL.
let failed = 0;
const report = (ok, label, note) => { if (!ok) failed++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${note ? '  (' + note + ')' : ''}`); };
const info = (label) => console.log(`  info  ${label}`);
const finish = () => process.exit(failed ? 1 : 0);

module.exports = { hc, report, info, finish };
