/*
 * Musik & Signaltöne über die Web Audio API – komplett generiert, keine Dateien/Lizenzen nötig.
 * Stile: 'ambient' (ruhiger Klangteppich), 'waves' (Meeresrauschen), 'file' (eigene Datei), 'off'.
 */
(function (root) {
  'use strict';

  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const CHORDS = [
    [48, 55, 64, 71], // Cmaj7
    [45, 52, 60, 67], // Am7
    [41, 53, 57, 64], // Fmaj7
    [43, 50, 59, 64], // G6
  ];
  const BELLS = [72, 74, 76, 79, 81, 84];

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.style = 'ambient';
      this.volume = 0.5;
      this.muted = false;
      this.playing = false;
      this.timers = [];
      this.nodes = [];
      this.audioEl = null;
    }

    ensure() {
      if (!this.ctx) {
        const AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return null;
        const ctx = (this.ctx = new AC());
        this.master = ctx.createGain();
        this.master.connect(ctx.destination);
        this.fx = ctx.createGain();
        this.fx.gain.value = 0.5;
        this.fx.connect(ctx.destination);
        this.reverb = ctx.createConvolver();
        this.reverb.buffer = this._impulse(3.5);
        const wet = ctx.createGain();
        wet.gain.value = 0.6;
        this.reverb.connect(wet);
        wet.connect(this.master);
        this._applyVolume();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    }

    _impulse(sec) {
      const ctx = this.ctx;
      const len = Math.floor(ctx.sampleRate * sec);
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
      }
      return buf;
    }

    _applyVolume() {
      const v = this.muted ? 0 : this.volume;
      if (this.master) this.master.gain.setTargetAtTime(v * 0.7, this.ctx.currentTime, 0.1);
      if (this.audioEl) this.audioEl.volume = v;
    }

    setVolume(v) { this.volume = Math.max(0, Math.min(1, v)); this._applyVolume(); }
    setMuted(m) { this.muted = !!m; this._applyVolume(); }

    setStyle(style) {
      const wasPlaying = this.playing;
      this.pause();
      this.style = style;
      if (wasPlaying) this.play();
    }

    setFile(file) {
      if (this.audioEl) { this.audioEl.pause(); URL.revokeObjectURL(this.audioEl.src); }
      this.audioEl = new Audio(URL.createObjectURL(file));
      this.audioEl.loop = true;
      this._applyVolume();
    }

    play() {
      if (this.playing) return;
      this.playing = true;
      if (this.style === 'off') return;
      if (this.style === 'file') {
        if (this.audioEl) this.audioEl.play().catch(() => {});
        return;
      }
      if (!this.ensure()) return;
      this.bus = this.ctx.createGain();
      this.bus.gain.value = 0;
      this.bus.gain.setTargetAtTime(1, this.ctx.currentTime, 1.2);
      this.bus.connect(this.master);
      this.bus.connect(this.reverb);
      if (this.style === 'waves') this._startWaves();
      else this._startAmbient();
    }

    pause() {
      if (!this.playing) return;
      this.playing = false;
      this.timers.forEach(clearInterval);
      this.timers = [];
      if (this.audioEl) this.audioEl.pause();
      if (this.bus && this.ctx) {
        const bus = this.bus;
        const nodes = this.nodes;
        bus.gain.cancelScheduledValues(this.ctx.currentTime);
        bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
        setTimeout(() => {
          nodes.forEach((n) => { try { n.stop(); } catch (e) { /* bereits gestoppt */ } });
          bus.disconnect();
        }, 1500);
        this.bus = null;
        this.nodes = [];
      }
    }

    // --- Klangteppich -------------------------------------------------------
    _startAmbient() {
      let chordIdx = 0;
      const playChord = () => {
        const ctx = this.ctx;
        const t = ctx.currentTime;
        const chord = CHORDS[chordIdx++ % CHORDS.length];
        chord.forEach((m) => {
          ['sine', 'triangle'].forEach((type, i) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 900;
            osc.type = type;
            osc.frequency.value = midi(m);
            osc.detune.value = i ? 6 : -4;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(i ? 0.025 : 0.04, t + 3);
            g.gain.setValueAtTime(i ? 0.025 : 0.04, t + 7);
            g.gain.linearRampToValueAtTime(0, t + 10.5);
            osc.connect(lp); lp.connect(g); g.connect(this.bus);
            osc.start(t); osc.stop(t + 11);
            this._track(osc);
          });
        });
      };
      const bell = () => {
        if (Math.random() > 0.45) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = midi(BELLS[Math.floor(Math.random() * BELLS.length)]);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.03, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
        osc.connect(g); g.connect(this.bus);
        osc.start(t); osc.stop(t + 4.1);
        this._track(osc);
      };
      playChord();
      this.timers.push(setInterval(playChord, 8000));
      this.timers.push(setInterval(bell, 2300));
    }

    // --- Meeresrauschen -----------------------------------------------------
    _startWaves() {
      const ctx = this.ctx;
      const len = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; // gedämpftes „braunes“ Rauschen
        d[i] = last * 3.5;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 500;
      const amp = ctx.createGain();
      amp.gain.value = 0.45;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.09;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.35;
      const lfo2 = ctx.createOscillator();
      lfo2.frequency.value = 0.09;
      const lfo2Gain = ctx.createGain();
      lfo2Gain.gain.value = 350;
      lfo.connect(lfoGain); lfoGain.connect(amp.gain);
      lfo2.connect(lfo2Gain); lfo2Gain.connect(lp.frequency);
      src.connect(lp); lp.connect(amp); amp.connect(this.bus);
      [src, lfo, lfo2].forEach((n) => { n.start(); this._track(n); });
    }

    _track(node) {
      this.nodes.push(node);
      node.onended = () => { this.nodes = this.nodes.filter((n) => n !== node); };
    }

    // --- Signaltöne ---------------------------------------------------------
    beep(freq, dur, vol) {
      if (!this.ensure()) return;
      const ctx = this.ctx;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq || 880;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol || 0.4, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.15));
      osc.connect(g); g.connect(this.fx);
      osc.start(t); osc.stop(t + (dur || 0.15) + 0.05);
    }
  }

  root.AudioEngine = AudioEngine;
})(typeof self !== 'undefined' ? self : this);
