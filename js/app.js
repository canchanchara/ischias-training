/* UI & Trainingsablauf */
(function () {
  'use strict';

  const { EXERCISES, CATEGORIES } = window.Exercises;
  const P = window.Plan;
  const { Figure, snapshot } = window.Figure;
  const byId = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
  const $ = (s) => document.querySelector(s);

  // ---------- Speicher ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privat-Modus */ } },
  };
  const settings = Object.assign(
    { level: 'normal', music: 'ambient', volume: 0.5, voice: true, beep: true, accepted: false },
    store.get('ischias.settings', {})
  );
  if (settings.music === 'file') settings.music = 'ambient'; // Datei überlebt keinen Neustart
  const saveSettings = () => store.set('ischias.settings', settings);
  let log = store.get('ischias.log', []);

  // ---------- Audio ----------
  const audio = new window.AudioEngine();
  audio.setVolume(settings.volume);
  audio.style = settings.music;

  function speak(text) {
    if (!settings.voice || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = 0.95;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang && v.lang.startsWith('de'));
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  }

  // ---------- Zustand ----------
  const todayKey = P.dateKey(new Date());
  let viewKey = todayKey;
  let plan = null;
  let timeline = [];

  function show(id) {
    ['view-home', 'view-workout', 'view-done'].forEach((v) => { $('#' + v).hidden = v !== id; });
    window.scrollTo(0, 0);
  }

  function dayTitle(key) {
    const diff = P.daysBetween(todayKey, key);
    if (diff === 0) return 'Heute';
    if (diff === 1) return 'Morgen';
    if (diff === -1) return 'Gestern';
    return keyToDate(key).toLocaleDateString('de-DE', { weekday: 'long' });
  }
  function keyToDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const fmtDate = (key, opts) => keyToDate(key).toLocaleDateString('de-DE', opts || { weekday: 'short', day: 'numeric', month: 'long' });
  const minutes = (sec) => Math.round(sec / 60) + ' Min';

  // ---------- Startseite ----------
  function renderLevels() {
    const wrap = $('#level-switch');
    wrap.innerHTML = '';
    Object.entries(P.LEVELS).forEach(([id, lvl]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(settings.level === id));
      b.textContent = lvl.label;
      b.addEventListener('click', () => { settings.level = id; saveSettings(); renderHome(); });
      wrap.appendChild(b);
    });
    $('#level-hint').textContent = P.LEVELS[settings.level].hint;
  }

  function renderHome() {
    plan = P.generatePlan(viewKey, settings.level, EXERCISES);
    timeline = P.buildTimeline(plan);

    $('#day-title').textContent = dayTitle(viewKey);
    $('#day-date').textContent = fmtDate(viewKey, { weekday: 'long', day: 'numeric', month: 'long' });
    renderLevels();
    $('#sum-count').textContent = plan.items.length + ' Übungen';
    $('#sum-time').textContent = 'ca. ' + minutes(P.totalDuration(timeline));
    $('#done-badge').hidden = !(viewKey === todayKey && log.some((e) => e.date === todayKey));

    const list = $('#plan-list');
    list.innerHTML = '';
    plan.items.forEach((it) => {
      const ex = byId[it.id];
      const li = document.createElement('li');
      li.tabIndex = 0;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'thumb figure');
      snapshot(svg, ex, 1);
      const meta = document.createElement('div');
      meta.className = 'meta';
      const name = document.createElement('strong');
      name.textContent = ex.name;
      const cat = document.createElement('span');
      cat.textContent = CATEGORIES[it.category] + (it.sides ? ' · beide Seiten' : '');
      meta.append(name, cat);
      const dur = document.createElement('div');
      dur.className = 'dur';
      dur.textContent = it.sides ? '2 × ' + it.duration + ' s' : it.duration + ' s';
      li.append(svg, meta, dur);
      const open = () => openDetail(ex, it.category);
      li.addEventListener('click', open);
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      list.appendChild(li);
    });
    renderHistory();
  }

  function renderHistory() {
    const streak = P.computeStreak(log.map((e) => e.date), todayKey);
    $('#streak').textContent = log.length
      ? (streak > 0 ? '🔥 ' + streak + (streak === 1 ? ' Tag' : ' Tage') + ' in Folge' : 'Heute ist ein guter Tag, wieder anzufangen.')
      : 'Noch keine Einheiten – los geht’s!';
    const ul = $('#history');
    ul.innerHTML = '';
    log.slice(-7).reverse().forEach((e) => {
      const li = document.createElement('li');
      li.textContent = fmtDate(e.date) + ' · ' + P.LEVELS[e.level].label + ' · ' + e.minutes + ' Min'
        + (typeof e.pain === 'number' ? ' · Schmerz ' + e.pain + '/10' : '');
      ul.appendChild(li);
    });
  }

  // ---------- Detail-Dialog ----------
  let detailFig = null;
  function fillSteps(ol, steps) {
    ol.innerHTML = '';
    steps.forEach((s) => { const li = document.createElement('li'); li.textContent = s; ol.appendChild(li); });
  }
  function openDetail(ex, category) {
    $('#detail-cat').textContent = CATEGORIES[category] || '';
    $('#detail-name').textContent = ex.name;
    $('#detail-short').textContent = ex.short;
    fillSteps($('#detail-steps'), ex.steps);
    $('#detail-tip').textContent = ex.tip ? '💡 ' + ex.tip : '';
    $('#detail-caution').textContent = ex.caution ? '⚠️ ' + ex.caution : '';
    if (!detailFig) detailFig = new Figure($('#detail-figure'));
    detailFig.pause();
    detailFig.setExercise(ex);
    detailFig.play();
    $('#detail').showModal();
  }
  $('#detail').addEventListener('close', () => detailFig && detailFig.pause());

  // ---------- Training ----------
  const woFig = new Figure($('#wo-figure'));
  const RING = 2 * Math.PI * 52;
  $('#wo-ring').style.strokeDasharray = RING;

  const W = { idx: 0, remainingMs: 0, stepEnd: 0, running: false, timer: null, lastBeep: null, muted: false };
  let wakeLock = null;

  async function requestWakeLock() {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { wakeLock = null; }
  }
  function releaseWakeLock() {
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && W.running) requestWakeLock();
  });

  function startWorkout() {
    audio.ensure();
    testBtn.textContent = 'Musik probehören';
    show('view-workout');
    enterStep(0);
    resume();
    requestWakeLock();
  }

  function stepLabel(st) {
    return { prep: 'Vorbereiten', work: 'Übung', rest: 'Pause', switch: 'Seitenwechsel' }[st.type];
  }

  function enterStep(i) {
    W.idx = i;
    const st = timeline[i];
    const ex = byId[st.exerciseId];
    W.remainingMs = st.duration * 1000;
    W.lastBeep = null;

    const phase = $('#wo-phase');
    phase.textContent = st.type === 'rest' ? 'Pause – gleich:' : st.type === 'prep' ? 'Vorbereiten' : stepLabel(st);
    phase.className = 'wo-phase ' + (st.type === 'work' ? '' : st.type === 'prep' ? 'prep' : 'rest');
    $('.wo-timer').classList.toggle('rest', st.type !== 'work');
    $('#wo-name').textContent = ex.name;
    const side = $('#wo-side');
    side.hidden = !st.side;
    side.textContent = st.side ? (st.type === 'switch' ? 'Wechsel auf ' : '') + (st.side === 'rechts' ? 'Rechte Seite' : 'Linke Seite') : '';
    $('#wo-count').textContent = 'Übung ' + (st.index + 1) + ' von ' + plan.items.length;
    $('#wo-bar').style.width = (i / timeline.length) * 100 + '%';
    fillSteps($('#wo-steps'), ex.steps);
    $('#wo-tip').textContent = ex.tip ? '💡 ' + ex.tip : '';
    $('#wo-caution').textContent = ex.caution ? '⚠️ ' + ex.caution : '';

    if (woFig.ex !== ex) woFig.setExercise(ex);
    if (W.running) woFig.play();

    // Ansagen & Töne
    const sideText = st.side ? (st.side === 'rechts' ? ' Rechte Seite.' : ' Linke Seite.') : '';
    if (st.type === 'prep') speak('Los geht’s. Erste Übung: ' + ex.name + '.' + sideText.replace(' Rechte', ' Wir beginnen mit der rechten'));
    if (st.type === 'rest') speak('Kurze Pause. Als Nächstes: ' + ex.name + '.');
    if (st.type === 'switch') speak('Seite wechseln.');
    if (st.type === 'work') {
      if (settings.beep) audio.beep(1046, 0.35, 0.45);
      if (timeline[i - 1] && timeline[i - 1].type !== 'switch') speak(ex.name + '.' + sideText);
    }
    updateTimerUI();
  }

  function remainingTotal() {
    let s = Math.max(0, W.remainingMs) / 1000;
    for (let j = W.idx + 1; j < timeline.length; j++) s += timeline[j].duration;
    return s;
  }

  function updateTimerUI() {
    const st = timeline[W.idx];
    const rem = Math.max(0, W.remainingMs);
    $('#wo-time').textContent = P.formatTime(rem / 1000);
    $('#wo-ring').style.strokeDashoffset = RING * (1 - rem / (st.duration * 1000));
    $('#wo-total').textContent = P.formatTime(remainingTotal());
  }

  function tick() {
    if (!W.running) return;
    W.remainingMs = W.stepEnd - performance.now();
    const sec = Math.ceil(W.remainingMs / 1000);
    if (sec >= 1 && sec <= 3 && sec !== W.lastBeep) {
      W.lastBeep = sec;
      if (settings.beep) audio.beep(660, 0.12, 0.3);
    }
    if (W.remainingMs <= 0) {
      if (W.idx + 1 < timeline.length) {
        enterStep(W.idx + 1);
        W.stepEnd = performance.now() + W.remainingMs;
      } else {
        finish();
        return;
      }
    }
    updateTimerUI();
  }

  function resume() {
    W.running = true;
    W.stepEnd = performance.now() + W.remainingMs;
    clearInterval(W.timer);
    W.timer = setInterval(tick, 100);
    woFig.play();
    if (!W.muted) audio.play();
    $('#wo-play').textContent = '❚❚';
    $('#wo-play').setAttribute('aria-label', 'Pause');
  }

  function pause() {
    if (!W.running) return;
    W.running = false;
    clearInterval(W.timer);
    W.remainingMs = W.stepEnd - performance.now();
    woFig.pause();
    audio.pause();
    $('#wo-play').textContent = '▶';
    $('#wo-play').setAttribute('aria-label', 'Fortsetzen');
  }

  function jump(i) {
    enterStep(i);
    if (W.running) W.stepEnd = performance.now() + W.remainingMs;
  }

  function stopWorkout() {
    pause();
    releaseWakeLock();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  function finish() {
    stopWorkout();
    if (settings.beep) { audio.beep(784, 0.2); setTimeout(() => audio.beep(1046, 0.4), 220); }
    speak('Geschafft! Gut gemacht.');
    $('#done-text').textContent = plan.items.length + ' Übungen in ca. ' + minutes(P.totalDuration(timeline)) + ' – stark!';
    show('view-done');
  }

  $('#start-btn').addEventListener('click', startWorkout);
  $('#wo-play').addEventListener('click', () => (W.running ? pause() : resume()));
  $('#wo-next').addEventListener('click', () => (W.idx + 1 < timeline.length ? jump(W.idx + 1) : finish()));
  $('#wo-prev').addEventListener('click', () => {
    const elapsed = timeline[W.idx].duration * 1000 - W.remainingMs;
    jump(elapsed > 3000 || W.idx === 0 ? W.idx : W.idx - 1);
  });
  // Eigener Dialog statt confirm() – confirm() ist in eingebetteten Ansichten blockiert.
  const exitDialog = $('#confirm-exit');
  let resumeAfterExitDialog = false;
  $('#wo-close').addEventListener('click', () => {
    resumeAfterExitDialog = W.running;
    pause();
    exitDialog.returnValue = '';
    exitDialog.showModal();
  });
  exitDialog.addEventListener('close', () => {
    if (exitDialog.returnValue === 'exit') { stopWorkout(); show('view-home'); renderHome(); }
    else if (resumeAfterExitDialog) resume();
  });
  $('#wo-mute').addEventListener('click', () => {
    W.muted = !W.muted;
    $('#wo-mute').style.opacity = W.muted ? 0.4 : 1;
    if (W.muted) audio.pause(); else if (W.running) audio.play();
  });

  // ---------- Fertig ----------
  $('#pain').addEventListener('input', (e) => { $('#pain-value').textContent = e.target.value; });
  $('#done-save').addEventListener('click', () => {
    log = log.filter((e) => e.date !== todayKey);
    log.push({ date: todayKey, level: settings.level, minutes: Math.round(P.totalDuration(timeline) / 60), pain: Number($('#pain').value) });
    store.set('ischias.log', log);
    show('view-home');
    renderHome();
  });
  $('#done-skip').addEventListener('click', () => { show('view-home'); renderHome(); });

  // ---------- Navigation & Einstellungen ----------
  $('#day-prev').addEventListener('click', () => { viewKey = P.addDays(viewKey, -1); renderHome(); });
  $('#day-next').addEventListener('click', () => { viewKey = P.addDays(viewKey, 1); renderHome(); });

  const musicSel = $('#music-select');
  musicSel.value = settings.music;
  musicSel.addEventListener('change', () => {
    $('#file-row').hidden = musicSel.value !== 'file';
    if (musicSel.value === 'file' && !audio.audioEl) { $('#music-file').click(); return; }
    settings.music = musicSel.value;
    audio.setStyle(settings.music);
    saveSettings();
  });
  $('#music-file').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    audio.setFile(file);
    settings.music = 'file';
    audio.setStyle('file');
  });

  const vol = $('#volume');
  vol.value = settings.volume;
  vol.addEventListener('input', () => { settings.volume = Number(vol.value); audio.setVolume(settings.volume); saveSettings(); });

  $('#voice-toggle').checked = settings.voice;
  $('#voice-toggle').addEventListener('change', (e) => { settings.voice = e.target.checked; saveSettings(); });
  $('#beep-toggle').checked = settings.beep;
  $('#beep-toggle').addEventListener('change', (e) => { settings.beep = e.target.checked; saveSettings(); });

  const testBtn = $('#music-test');
  testBtn.addEventListener('click', () => {
    audio.ensure();
    if (audio.playing) { audio.pause(); testBtn.textContent = 'Musik probehören'; }
    else { audio.play(); testBtn.textContent = 'Musik stoppen'; }
  });

  // ---------- Hinweise ----------
  const disclaimer = $('#disclaimer');
  $('#show-disclaimer').addEventListener('click', () => disclaimer.showModal());
  disclaimer.addEventListener('close', () => { settings.accepted = true; saveSettings(); });
  disclaimer.addEventListener('cancel', (e) => { if (!settings.accepted) e.preventDefault(); });

  renderHome();
  if (!settings.accepted) disclaimer.showModal();
})();
