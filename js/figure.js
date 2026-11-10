/*
 * Animierte Strichfigur (SVG). Interpoliert zwischen poses.a und poses.b einer Übung:
 * A → B (Bewegung), kurz halten, B → A, kurz halten.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Figure = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const PROPS = {
    chair: 'M88 126 H150 M94 126 V172 M144 126 V172 M88 126 V66',
  };

  const smooth = (t) => t * t * (3 - 2 * t);

  /** Zyklusphase (0..1) → Mischwert (0 = Haltung A, 1 = Haltung B). */
  function phaseToMix(p) {
    p = ((p % 1) + 1) % 1;
    if (p < 0.4) return smooth(p / 0.4);
    if (p < 0.5) return 1;
    if (p < 0.9) return 1 - smooth((p - 0.5) / 0.4);
    return 0;
  }

  function lerpPose(a, b, t) {
    const out = {};
    for (const k of Object.keys(a)) {
      const pa = a[k];
      const pb = (b && b[k]) || pa;
      out[k] = [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t];
    }
    return out;
  }

  const f = (n) => Math.round(n * 10) / 10;
  const pt = (p) => f(p[0]) + ' ' + f(p[1]);
  const limbPath = (a, b, c) => 'M' + pt(a) + ' L' + pt(b) + ' L' + pt(c);

  function torsoPath(p) {
    const n = p.neck, h = p.hip;
    const m = p.mid || [(n[0] + h[0]) / 2, (n[1] + h[1]) / 2];
    // Kontrollpunkt so wählen, dass die Kurve durch "mid" verläuft
    const c = [2 * m[0] - (n[0] + h[0]) / 2, 2 * m[1] - (n[1] + h[1]) / 2];
    return 'M' + pt(n) + ' Q' + pt(c) + ' ' + pt(h);
  }

  const ASPECT = 260 / 155;
  const FLOOR = 180;

  /** Ausschnitt, der beide Haltungen einer Übung möglichst groß zeigt (feste Seitenverhältnisse, Boden unten). */
  function fitViewBox(ex) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity;
    for (const pose of [ex.poses.a, ex.poses.b]) {
      for (const k of Object.keys(pose)) {
        minX = Math.min(minX, pose[k][0]);
        maxX = Math.max(maxX, pose[k][0]);
        minY = Math.min(minY, pose[k][1]);
      }
    }
    if (ex.prop === 'chair') { minX = Math.min(minX, 88); minY = Math.min(minY, 66); }
    minX -= 22; maxX += 22; minY -= 18;
    let w = maxX - minX;
    let h = FLOOR - minY;
    if (w / h < ASPECT) w = h * ASPECT; else h = w / ASPECT;
    const x0 = (minX + maxX) / 2 - w / 2;
    return [f(x0), f(FLOOR - h), f(w), f(h)];
  }

  class Figure {
    constructor(svg) {
      this.svg = svg;
      svg.setAttribute('viewBox', '0 25 260 155');
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const mk = (tag, cls, attrs) => {
        const e = document.createElementNS(NS, tag);
        if (cls) e.setAttribute('class', cls);
        for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
        svg.appendChild(e);
        return e;
      };
      mk('line', 'fig-floor', { x1: -200, y1: 175.5, x2: 460, y2: 175.5 });
      this.mat = mk('rect', 'fig-mat', { x: 8, y: 171, width: 244, height: 5, rx: 2.5 });
      this.prop = mk('path', 'fig-prop', { d: '' });
      this.armF = mk('path', 'fig-limb fig-far');
      this.legF = mk('path', 'fig-limb fig-far');
      this.torso = mk('path', 'fig-torso');
      this.neckLine = mk('path', 'fig-limb fig-near');
      this.head = mk('circle', 'fig-head', { r: 11 });
      this.legN = mk('path', 'fig-limb fig-near');
      this.armN = mk('path', 'fig-limb fig-near');
      this.ex = null;
      this.elapsed = 0;
      this.running = false;
      this.raf = null;
      this._loop = this._loop.bind(this);
    }

    setExercise(ex) {
      this.ex = ex;
      this.elapsed = 0;
      this.prop.setAttribute('d', ex.prop ? PROPS[ex.prop] || '' : '');
      this.mat.style.display = ex.prop === 'chair' ? 'none' : '';
      this.svg.setAttribute('viewBox', fitViewBox(ex).join(' '));
      this.render(0);
    }

    render(mix) {
      if (!this.ex) return;
      const p = lerpPose(this.ex.poses.a, this.ex.poses.b, mix);
      this.torso.setAttribute('d', torsoPath(p));
      this.neckLine.setAttribute('d', 'M' + pt(p.neck) + ' L' + pt(p.head));
      this.head.setAttribute('cx', f(p.head[0]));
      this.head.setAttribute('cy', f(p.head[1]));
      this.armN.setAttribute('d', limbPath(p.neck, p.elbowN, p.handN));
      this.armF.setAttribute('d', limbPath(p.neck, p.elbowF, p.handF));
      this.legN.setAttribute('d', limbPath(p.hip, p.kneeN, p.footN));
      this.legF.setAttribute('d', limbPath(p.hip, p.kneeF, p.footF));
    }

    play() {
      if (this.running || !this.ex) return;
      this.running = true;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this._loop);
    }

    pause() {
      this.running = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
    }

    _loop(now) {
      if (!this.running) return;
      this.elapsed += now - this.last;
      this.last = now;
      const cycle = (this.ex.cycle || 6) * 1000;
      this.render(phaseToMix(this.elapsed / cycle));
      this.raf = requestAnimationFrame(this._loop);
    }
  }

  /** Statisches Vorschaubild einer Übung (Endhaltung). */
  function snapshot(svg, ex, mix) {
    const fig = new Figure(svg);
    fig.setExercise(ex);
    fig.render(mix === undefined ? 1 : mix);
    return fig;
  }

  return { Figure, snapshot, phaseToMix, lerpPose, torsoPath, fitViewBox };
});
