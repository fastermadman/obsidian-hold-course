'use strict';
// #123 task 5: do fields a companion plugin adds (unknown to Hold Course) survive
// load/save, Copy class, Move class, edits, bulk add and the exporters?
//
// "Survives" = the object that carries the field still has it, deep-equal, after
// the operation. Checked on every level a companion might write to: semester,
// class, lecture, lecture-nested assignment, class assignment, exam, resource, group.
// Controls prove the probe can see a loss: fields the code is known to delete on
// Copy class (finalGrade, attendance, status) must come out as lost.
const { hc, report, info, finish } = require('./_load.js');
const assert = require('node:assert/strict');
const K = 'x_ext';
const MARK = { by: 'companion', n: 1 };
const mk = (o) => ({ ...o, [K]: structuredClone(MARK) });

function fixture() {
  return {
    currentSemesterId: 's1',
    dataVersion: 2,
    settings: { einkMode: false, uiScale: 100 },
    groups: [mk({ id: 'g1', name: 'Study', classId: 'c1', repeat: { every: 'week', days: ['Mon'] }, startDate: '2026-01-05', meetings: [] })],
    semesters: [
      mk({ id: 's1', name: 'Spring 2026', term: 'Spring', year: 2026,
        classes: [mk({
          id: 'c1', code: 'C1', name: 'Class one', colorIndex: 0, startDate: '2026-01-05', endDate: '2026-05-01',
          meetingDays: ['Mon', 'Wed'], finalGrade: 'A', attendance: { marks: {} }, status: 'completed',
          lectures: [
            mk({ id: 'l1', title: 'L1', date: '2026-01-05', status: 'done', notes: '', vaultLink: '',
              assignments: [mk({ id: 'a2', title: 'A2', type: 'Reading', dueDate: '2026-01-12', status: 'done', grade: '90', linkedBook: 'r1' })] }),
            mk({ id: 'l2', title: 'L2', date: '2026-01-07', status: 'not-started', notes: '', vaultLink: '', assignments: [] }),
          ],
          assignments: [mk({ id: 'a1', title: 'A1', type: 'Writing', dueDate: '2026-02-01', status: 'not-started', grade: '' })],
          exams: [mk({ id: 'e1', title: 'E1', dueDate: '2026-03-01', status: 'not-started', grade: '' })],
        })],
        resources: [mk({ id: 'r1', title: 'R1', classIds: ['c1'], status: 'read' })],
      }),
      mk({ id: 's2', name: 'Fall 2026', term: 'Fall', year: 2026, classes: [], resources: [] }),
    ],
  };
}

function plugin(data) {
  const p = Object.create(hc.prototype);
  p.data = data;
  p.visibleSemesters = () => p.data.semesters;
  return p;
}

const has = (o) => !!o && K in o && (() => { try { assert.deepEqual(o[K], MARK); return true; } catch { return false; } })();
const byTitle = (arr, t) => (arr || []).find(x => x.title === t);

// Every level, located by its stable title/id inside a class and its semester.
function levels(sem, cls, resId) {
  const l1 = byTitle(cls.lectures, 'L1');
  return {
    semester: sem, class: cls,
    lecture: l1, 'nested assignment': byTitle(l1 && l1.assignments, 'A2'),
    'class assignment': byTitle(cls.assignments, 'A1'),
    exam: byTitle(cls.exams, 'E1'),
    resource: (sem.resources || []).find(r => r.title === 'R1'),
  };
}
function checkLevels(prefix, lv, skip = []) {
  for (const [name, obj] of Object.entries(lv)) {
    if (skip.includes(name)) continue;
    report(has(obj), `${prefix}: ${name} keeps ${K}`);
  }
}

async function main() {
  // 1. Load + save round trip
  {
    const stored = fixture();
    const p = plugin(null);
    p.loadData = async () => structuredClone(stored);
    p._recordDiskStamp = async () => {}; p.refreshTodayView = () => {};
    let written = null;
    p.saveData = async (d) => { written = JSON.parse(JSON.stringify(d)); };
    if (typeof p._loadAndNormalize === 'function') await p._loadAndNormalize();
    else { p.data = await p.loadData(); info('load: no _loadAndNormalize at this ref; loadData() result used as is'); }
    await p.save();
    const sem = written.semesters[0], cls = sem.classes[0];
    checkLevels('load/save', levels(sem, cls));
    report(has(written.groups[0]), 'load/save: group keeps x_ext');
  }

  // 2. Copy class: same semester and other semester, all date modes, keepNotes on/off
  for (const [label, target, opts] of [
    ['copy same semester (keep dates)', 's1', {}],
    ['copy other semester (keep dates)', 's2', {}],
    ['copy other semester (shift dates)', 's2', { dateMode: 'shift', newStartDate: '2026-08-31' }],
    ['copy other semester (clear dates)', 's2', { dateMode: 'clear' }],
    ['copy other semester (keepNotes false)', 's2', { keepNotes: false }],
  ]) {
    const p = plugin(fixture());
    if (typeof p.copyClass !== 'function') { info(`${label}: copyClass does not exist at this ref`); continue; }
    const copy = p.copyClass('s1', target, 'c1', opts);
    if (!copy) { report(false, `${label}: copyClass returned null`); continue; }
    const tsem = p.data.semesters.find(s => s.id === target);
    const lv = levels(tsem, copy);
    // Same-semester copies tag the existing resource instead of cloning it.
    checkLevels(label, lv);
    // Controls: these are deleted on purpose, so the probe must see them gone.
    report(!('finalGrade' in copy) && !('attendance' in copy) && !('status' in copy), `${label}: control — finalGrade/attendance/status are dropped (probe can see a loss)`);
  }

  // 3. Move class
  if (typeof plugin({}).moveClass !== 'function') info('move: moveClass does not exist at this ref');
  else {
    const p = plugin(fixture());
    const ok = p.moveClass('s1', 's2', 'c1');
    const tsem = p.data.semesters.find(s => s.id === 's2');
    const moved = tsem.classes.find(c => c.id === 'c1');
    report(!!ok && !!moved, 'move: class arrived');
    if (moved) checkLevels('move', levels(tsem, moved));
  }

  // 4. Edits through the update methods (what the edit modals call)
  {
    const p = plugin(fixture());
    p.updateSemester('s1', { name: 'Spring 2026 (edited)' });
    p.updateClass('s1', 'c1', { name: 'Renamed', code: 'C1' });
    p.updateLecture('s1', 'c1', 'l1', { title: 'L1', status: 'in-progress' });
    p.updateAssignment('s1', 'c1', 'a1', { title: 'A1', status: 'done' });
    p.updateAssignment('s1', 'c1', 'a2', { title: 'A2', status: 'done' });
    p.updateExam('s1', 'c1', 'e1', { title: 'E1', grade: '80' });
    p.updateResource('s1', 'r1', { title: 'R1', status: 'reading' });
    const sem = p.data.semesters[0];
    checkLevels('edit', levels(sem, sem.classes[0]));
  }

  // 5. Bulk add (the dialog calls addLecture once per parsed row)
  {
    const p = plugin(fixture());
    const parsed = hc.parseBulkLectures('New A\nNew B', { startDate: '2026-02-02', meetingDays: ['Mon'] });
    for (const row of parsed.rows) if (row.title) p.addLecture('s1', 'c1', { title: row.title, date: row.date });
    const cls = p.data.semesters[0].classes[0];
    report(cls.lectures.length === 4, 'bulk add: rows added', `${cls.lectures.length} lectures`);
    report(has(byTitle(cls.lectures, 'L1')) && has(byTitle(cls.lectures, 'L2')), 'bulk add: existing lectures keep x_ext');
    const added = cls.lectures.filter(l => l.title.startsWith('New'));
    info(`bulk add: new lectures have keys [${Object.keys(added[0] || {}).join(', ')}] — built field by field, so a companion cannot pre-seed fields`);
  }

  // 6. Exporters
  {
    const p = plugin(fixture());
    p.manifest = { version: 'probe' };
    let text = '';
    p._writeNewExport = async (name, t) => { text = t; return name; };
    await p.exportBackup();
    let backup = null; try { backup = JSON.parse(text); } catch {}
    report(!!backup && has(backup.data.semesters[0].classes[0].lectures[0]), 'backup JSON keeps x_ext (whole data object is written)');
    const csv = hc.itemsCsv ? hc.itemsCsv(fixture().semesters, fixture().groups) : null;
    if (csv === null) info('CSV: itemsCsv not found at this ref');
    else info(`CSV exporter: x_ext ${csv.includes('companion') ? 'IS' : 'is NOT'} exported (fixed columns; expected "not")`);
    const cls = fixture().semesters[0].classes[0];
    const md = hc.syllabusMarkdown ? hc.syllabusMarkdown(cls, fixture().semesters[0], {}) : null;
    if (md === null) info('Syllabus: syllabusMarkdown not found at this ref');
    else info(`Syllabus exporter: x_ext ${String(md).includes('companion') ? 'IS' : 'is NOT'} exported (fixed fields; expected "not")`);
  }
  finish();
}
main().catch(e => { console.log('  FAIL  probe crashed: ' + (e && e.stack || e)); process.exit(1); });
