const test = require('node:test');
const assert = require('node:assert/strict');

const P = require('../js/plan.js');
const { EXERCISES, JOINTS, CATEGORIES } = require('../js/exercises.js');
const { phaseToMix, lerpPose, torsoPath, fitViewBox } = require('../js/figure.js');

const byId = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
const days = (start, n) => Array.from({ length: n }, (_, i) => P.addDays(start, i));
const slotCount = (lvl) => P.LEVELS[lvl].slots.reduce((s, [, c]) => s + c, 0);

// ---------- Hilfsfunktionen ----------
test('hashString ist deterministisch und unterscheidet Eingaben', () => {
  assert.equal(P.hashString('2026-11-09'), P.hashString('2026-11-09'));
  assert.notEqual(P.hashString('2026-11-09'), P.hashString('2026-11-10'));
});

test('mulberry32 liefert reproduzierbare Werte in [0,1)', () => {
  const a = P.mulberry32(42), b = P.mulberry32(42);
  for (let i = 0; i < 100; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test('shuffle verändert das Original nicht und behält alle Elemente', () => {
  const arr = [1, 2, 3, 4, 5];
  const out = P.shuffle(arr, P.mulberry32(1));
  assert.deepEqual(arr, [1, 2, 3, 4, 5]);
  assert.deepEqual([...out].sort(), arr);
});

test('Datumsfunktionen rechnen über Monats- und Jahresgrenzen', () => {
  assert.equal(P.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(P.addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(P.daysBetween('2026-11-01', '2026-11-09'), 8);
  assert.equal(P.dateKey(new Date(2026, 10, 9)), '2026-11-09');
});

test('formatTime', () => {
  assert.equal(P.formatTime(0), '0:00');
  assert.equal(P.formatTime(9.2), '0:10');
  assert.equal(P.formatTime(75), '1:15');
  assert.equal(P.formatTime(-3), '0:00');
});

test('computeStreak zählt zusammenhängende Tage', () => {
  assert.equal(P.computeStreak([], '2026-11-09'), 0);
  assert.equal(P.computeStreak(['2026-11-07', '2026-11-08', '2026-11-09'], '2026-11-09'), 3);
  // heute noch nicht trainiert → Serie bis gestern zählt weiter
  assert.equal(P.computeStreak(['2026-11-07', '2026-11-08'], '2026-11-09'), 2);
  assert.equal(P.computeStreak(['2026-11-05', '2026-11-08'], '2026-11-09'), 1);
  assert.equal(P.computeStreak(['2026-11-01'], '2026-11-09'), 0);
});

// ---------- Tagesplan ----------
test('generatePlan ist für gleiches Datum und Level deterministisch', () => {
  const a = P.generatePlan('2026-11-09', 'normal', EXERCISES);
  const b = P.generatePlan('2026-11-09', 'normal', EXERCISES);
  assert.deepEqual(a, b);
});

test('unbekanntes Level fällt auf "normal" zurück', () => {
  const p = P.generatePlan('2026-11-09', 'gibtsnicht', EXERCISES);
  assert.equal(p.level, 'normal');
  assert.equal(p.items.length, slotCount('normal'));
});

for (const lvl of Object.keys(P.LEVELS)) {
  test(`Level ${lvl}: aufeinanderfolgende Tage unterscheiden sich (1 Jahr)`, () => {
    let prev = null;
    for (const k of days('2026-01-01', 365)) {
      const ids = P.generatePlan(k, lvl, EXERCISES).items.map((i) => i.id).join(',');
      if (prev !== null) assert.notEqual(ids, prev, `Plan am ${k} identisch mit Vortag`);
      prev = ids;
    }
  });

  test(`Level ${lvl}: richtige Anzahl, gültige Übungen, keine Doppelungen`, () => {
    for (const k of days('2026-01-01', 200)) {
      const p = P.generatePlan(k, lvl, EXERCISES);
      assert.equal(p.items.length, slotCount(lvl), k);
      const ids = p.items.map((i) => i.id);
      assert.equal(new Set(ids).size, ids.length, `Doppelte Übung am ${k}: ${ids}`);
      for (const it of p.items) {
        const ex = byId[it.id];
        assert.ok(ex, it.id);
        assert.ok(ex.categories.includes(it.category), `${it.id} passt nicht zu ${it.category}`);
        assert.equal(it.sides, !!ex.sides);
        assert.equal(it.duration % 5, 0);
        assert.ok(it.duration >= 20);
      }
    }
  });
}

test('Sanft enthält keine Kräftigung, Aktiv ist länger als Normal', () => {
  const k = '2026-11-09';
  const sanft = P.generatePlan(k, 'sanft', EXERCISES);
  assert.ok(sanft.items.every((i) => i.category !== 'strength'));
  const t = (lvl) => P.totalDuration(P.buildTimeline(P.generatePlan(k, lvl, EXERCISES)));
  assert.ok(t('sanft') < t('normal'));
  assert.ok(t('normal') < t('aktiv'));
});

test('über eine Woche kommen unterschiedliche Übungen vor (Abwechslung)', () => {
  const seen = new Set();
  for (const k of days('2026-11-09', 7)) P.generatePlan(k, 'normal', EXERCISES).items.forEach((i) => seen.add(i.id));
  assert.ok(seen.size >= 12, `nur ${seen.size} verschiedene Übungen`);
});

test('Datum vor dem Startdatum der Kette funktioniert', () => {
  const p = P.generatePlan('2024-06-01', 'normal', EXERCISES);
  assert.equal(p.items.length, slotCount('normal'));
});

// ---------- Timeline ----------
test('buildTimeline: Vorbereitung, Seiten, Pausen', () => {
  const plan = {
    key: 'x', level: 'normal',
    items: [
      { id: 'atmung', category: 'warmup', sides: false, duration: 60 },
      { id: 'piriformis', category: 'stretch', sides: true, duration: 40 },
    ],
  };
  const tl = P.buildTimeline(plan, { prep: 10, rest: 15, switchTime: 6 });
  assert.deepEqual(tl.map((s) => s.type), ['prep', 'work', 'rest', 'work', 'switch', 'work']);
  assert.deepEqual(tl.filter((s) => s.type === 'work').map((s) => s.side), [null, 'rechts', 'links']);
  assert.equal(tl[tl.length - 1].type, 'work', 'keine Pause nach der letzten Übung');
  assert.equal(P.totalDuration(tl), 10 + 60 + 15 + 40 + 6 + 40);
});

// ---------- Übungskatalog ----------
test('Übungskatalog: eindeutige IDs, vollständige Daten', () => {
  assert.equal(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length);
  for (const ex of EXERCISES) {
    assert.ok(ex.name && ex.short && ex.steps.length >= 3, ex.id);
    assert.ok(ex.categories.length > 0 && ex.categories.every((c) => c in CATEGORIES), ex.id);
    assert.ok(ex.duration > 0 && ex.cycle > 0, ex.id);
    for (const which of ['a', 'b']) {
      for (const j of JOINTS) {
        const p = ex.poses[which][j];
        assert.ok(Array.isArray(p) && p.length === 2 && p.every(Number.isFinite), `${ex.id}.${which}.${j}`);
        // innerhalb der viewBox "0 25 260 155"
        assert.ok(p[0] >= 0 && p[0] <= 260 && p[1] >= 25 && p[1] <= 180, `${ex.id}.${which}.${j} außerhalb`);
      }
    }
    assert.notDeepEqual(ex.poses.a, ex.poses.b, `${ex.id}: keine Bewegung`);
  }
});

test('jede Kategorie aller Level hat genug Übungen', () => {
  for (const lvl of Object.values(P.LEVELS)) {
    for (const [cat] of lvl.slots) {
      assert.ok(EXERCISES.some((e) => e.categories.includes(cat)), cat);
    }
  }
});

// ---------- Figur ----------
test('phaseToMix: A → B → halten → A', () => {
  assert.equal(phaseToMix(0), 0);
  assert.equal(phaseToMix(0.45), 1);
  assert.equal(phaseToMix(0.95), 0);
  assert.equal(phaseToMix(1.45), 1, 'periodisch');
  const v = phaseToMix(0.2);
  assert.ok(v > 0 && v < 1);
});

test('lerpPose interpoliert linear', () => {
  const p = lerpPose({ hip: [0, 0] }, { hip: [10, 20] }, 0.5);
  assert.deepEqual(p.hip, [5, 10]);
});

test('fitViewBox: festes Seitenverhältnis, Boden unten, alle Gelenke sichtbar', () => {
  for (const ex of EXERCISES) {
    const [x, y, w, h] = fitViewBox(ex);
    assert.ok(Math.abs(w / h - 260 / 155) < 0.01, ex.id);
    assert.ok(Math.abs(y + h - 180) < 0.2, `${ex.id}: Boden nicht unten`);
    for (const pose of [ex.poses.a, ex.poses.b]) {
      for (const [px, py] of Object.values(pose)) {
        assert.ok(px >= x && px <= x + w && py >= y && py <= y + h, `${ex.id}: Gelenk außerhalb`);
      }
    }
  }
});

test('torsoPath verläuft durch den Mittelpunkt', () => {
  const d = torsoPath({ neck: [0, 0], mid: [5, 5], hip: [10, 0] });
  // Kontrollpunkt = 2*mid - (neck+hip)/2 = (5,10)
  assert.equal(d, 'M0 0 Q5 10 10 0');
});
