/*
 * Reine Logik (ohne DOM): Tagesplan erzeugen, Ablauf (Timeline) bauen, Hilfsfunktionen.
 * Der Plan ist pro Datum deterministisch (gleiches Datum = gleicher Plan) und
 * unterscheidet sich bewusst vom Vortag, damit jeden Tag etwas Abwechslung entsteht.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Plan = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LEVELS = {
    sanft: {
      label: 'Sanft',
      hint: 'Für schmerzhafte Tage: ohne Kräftigung, kürzere Übungen.',
      factor: 0.8,
      slots: [['warmup', 2], ['mobility', 2], ['nerve', 1], ['stretch', 1], ['cooldown', 1]],
    },
    normal: {
      label: 'Normal',
      hint: 'Ausgewogener Mix aus Mobilisation, Nervengleiten, Dehnung und Kräftigung.',
      factor: 1,
      slots: [['warmup', 2], ['mobility', 2], ['nerve', 1], ['stretch', 1], ['strength', 2], ['cooldown', 1]],
    },
    aktiv: {
      label: 'Aktiv',
      hint: 'Für gute Tage: längere Übungen und mehr Kräftigung.',
      factor: 1.25,
      slots: [['warmup', 2], ['mobility', 2], ['nerve', 2], ['stretch', 2], ['strength', 3], ['cooldown', 1]],
    },
  };

  const EPOCH = '2025-01-01';

  function hashString(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  const pad = (n) => String(n).padStart(2, '0');

  function dateKey(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function keyToUTC(key) {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  }

  function addDays(key, n) {
    const dt = new Date(keyToUTC(key) + n * 86400000);
    return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate());
  }

  function daysBetween(a, b) {
    return Math.round((keyToUTC(b) - keyToUTC(a)) / 86400000);
  }

  function roundTo5(x) {
    return Math.max(20, Math.round(x / 5) * 5);
  }

  /** Wählt die Übungen für einen Tag; Übungen aus `avoid` (Vortag) werden nach hinten sortiert. */
  function pick(key, levelId, exercises, avoid) {
    const level = LEVELS[levelId] || LEVELS.normal;
    const rng = mulberry32(hashString(key + '|' + levelId));
    const used = new Set();
    const perSlot = level.slots.map(() => []);
    const poolSize = (cat) => exercises.filter((e) => e.categories.indexOf(cat) !== -1).length;
    // Knappe Kategorien zuerst auswählen, damit keine Kategorie erschöpft wird
    // (die Reihenfolge im Training bleibt die der Slots).
    const order = level.slots
      .map((s, i) => i)
      .sort((x, y) => poolSize(level.slots[x][0]) - poolSize(level.slots[y][0]) || x - y);
    for (const slotIdx of order) {
      const [cat, count] = level.slots[slotIdx];
      const picks = perSlot[slotIdx];
      const all = exercises.filter((e) => e.categories.indexOf(cat) !== -1);
      let pool = shuffle(all, rng).filter((e) => !used.has(e.id));
      if (avoid) {
        pool = pool.filter((e) => !avoid.has(e.id)).concat(pool.filter((e) => avoid.has(e.id)));
      }
      if (pool.length < count) {
        // Kategorie erschöpft: Wiederholung innerhalb der Einheit zulassen
        pool = pool.concat(shuffle(all, rng).filter((e) => pool.indexOf(e) === -1));
      }
      for (let i = 0; i < count && i < pool.length; i++) {
        used.add(pool[i].id);
        picks.push({ ex: pool[i], category: cat });
      }
    }
    return { picks: [].concat.apply([], perSlot), rng };
  }

  // Cache je Übungskatalog: "datum|level" -> Set der Übungs-IDs
  const chainCache = new WeakMap();

  /** IDs des tatsächlichen Plans eines Tages (Kette ab EPOCH, damit jeder Tag sicher vom Vortag abweicht). */
  function idsFor(key, levelId, exercises) {
    let cache = chainCache.get(exercises);
    if (!cache) { cache = new Map(); chainCache.set(exercises, cache); }
    const n = daysBetween(EPOCH, key);
    if (n <= 0) {
      return new Set(pick(key, levelId, exercises, null).picks.map((p) => p.ex.id));
    }
    let prev = null;
    for (let d = 0; d <= n; d++) {
      const k = addDays(EPOCH, d);
      const ck = k + '|' + levelId;
      let ids = cache.get(ck);
      if (!ids) {
        ids = new Set(pick(k, levelId, exercises, prev).picks.map((p) => p.ex.id));
        cache.set(ck, ids);
      }
      prev = ids;
    }
    return prev;
  }

  /**
   * Erzeugt den Tagesplan.
   * @returns {{key:string, level:string, items:{id:string, category:string, sides:boolean, duration:number}[]}}
   */
  function generatePlan(key, levelId, exercises) {
    const lvl = LEVELS[levelId] ? levelId : 'normal';
    const level = LEVELS[lvl];
    const avoid = daysBetween(EPOCH, key) > 0 ? idsFor(addDays(key, -1), lvl, exercises) : null;
    const { picks, rng } = pick(key, lvl, exercises, avoid);
    const items = picks.map((p) => ({
      id: p.ex.id,
      category: p.category,
      sides: !!p.ex.sides,
      duration: roundTo5(p.ex.duration * level.factor * (0.9 + rng() * 0.2)),
    }));
    return { key, level: lvl, items };
  }

  /**
   * Baut die Abfolge: Vorbereitung → Übung (ggf. rechts / Seitenwechsel / links) → Pause → …
   */
  function buildTimeline(plan, opts) {
    const o = Object.assign({ prep: 10, rest: 15, switchTime: 6 }, opts || {});
    const steps = [];
    plan.items.forEach((it, i) => {
      steps.push({ type: i === 0 ? 'prep' : 'rest', exerciseId: it.id, index: i, side: null, duration: i === 0 ? o.prep : o.rest });
      if (it.sides) {
        steps.push({ type: 'work', exerciseId: it.id, index: i, side: 'rechts', duration: it.duration });
        steps.push({ type: 'switch', exerciseId: it.id, index: i, side: 'links', duration: o.switchTime });
        steps.push({ type: 'work', exerciseId: it.id, index: i, side: 'links', duration: it.duration });
      } else {
        steps.push({ type: 'work', exerciseId: it.id, index: i, side: null, duration: it.duration });
      }
    });
    return steps;
  }

  function totalDuration(steps) {
    return steps.reduce((s, st) => s + st.duration, 0);
  }

  function formatTime(sec) {
    const s = Math.max(0, Math.ceil(sec));
    return Math.floor(s / 60) + ':' + pad(s % 60);
  }

  /** Anzahl aufeinanderfolgender Trainingstage bis heute (oder gestern, falls heute noch offen). */
  function computeStreak(keys, todayKey) {
    const set = new Set(keys);
    let day = set.has(todayKey) ? todayKey : addDays(todayKey, -1);
    let count = 0;
    while (set.has(day)) {
      count++;
      day = addDays(day, -1);
    }
    return count;
  }

  return {
    LEVELS, hashString, mulberry32, shuffle, dateKey, addDays, daysBetween,
    generatePlan, buildTimeline, totalDuration, formatTime, computeStreak,
  };
});
