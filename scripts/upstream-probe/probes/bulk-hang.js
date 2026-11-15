'use strict';
// #66: parseBulkLectures with day names outside {Mon..Sun} must return, not loop.
// Run under run.sh's hard timeout: a hang shows up as "HANG: killed after 20 s".
const { hc, report, finish } = require('./_load.js');
const r = hc.parseBulkLectures('L1\nL2\nL3', { startDate: '2026-01-05', meetingDays: ['Monday', 'Wednesday'] });
report(r.counts.lectures === 3, 'returns for full day names', `patternActive=${r.patternActive}`);
finish();
