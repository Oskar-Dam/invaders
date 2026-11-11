/* ============================================================
   WaveSystem — script de oleadas, formaciones y apariciones
   ============================================================ */

/* Evento de aparición: { t, type, x, y, holdY, opts } */

function vFormation(cx, count, spacing, yBase, tStep = 0.28, type = 'scout') {
  const events = [];
  const half = Math.floor(count / 2);
  for (let i = 0; i < count; i++) {
    const off = i - half;
    events.push({
      t: Math.abs(off) * tStep,
      type,
      x: cx + off * spacing,
      y: yBase + Math.abs(off) * 62,
      holdY: null,
      opts: {},
    });
  }
  return events;
}

function line(count, x0, x1, y, tStep, type, holdY, opts = {}) {
  const events = [];
  for (let i = 0; i < count; i++) {
    const k = count === 1 ? 0.5 : i / (count - 1);
    events.push({
      t: i * tStep,
      type,
      x: x0 + (x1 - x0) * k,
      y,
      holdY,
      opts: { ...opts },
    });
  }
  return events;
}

function column(count, x, yStart, gap, tStep, type, opts = {}) {
  const events = [];
  for (let i = 0; i < count; i++) {
    events.push({
      t: i * tStep,
      type,
      x,
      y: yStart + i * gap,
      holdY: null,
      opts: { ...opts },
    });
  }
  return events;
}

export const WAVES = [
  {
    name: 'WAVE 1 · FIRST CONTACT',
    build: (w) => [
      ...vFormation(0, 7, 120, 640, 0.3, 'scout'),
      ...vFormation(0, 5, 150, 760, 0.42, 'scout').map((e) => ({ ...e, t: e.t + 3.2 })),
    ],
  },
  {
    name: 'WAVE 2 · INTERCEPTORS',
    build: (w) => [
      ...line(4, -w * 0.6, w * 0.6, 660, 0.5, 'interceptor', 300),
      ...line(3, -w * 0.75, w * 0.75, 720, 0.9, 'meteor', null).map((e) => ({ ...e, t: e.t + 1.4 })),
      ...vFormation(0, 5, 140, 700, 0.35, 'scout').map((e) => ({ ...e, t: e.t + 4.5 })),
    ],
  },
  {
    name: 'WAVE 3 · HEAVY WALL',
    build: (w) => [
      { t: 0, type: 'heavy', x: -w * 0.4, y: 700, holdY: 330, opts: {} },
      { t: 0.8, type: 'heavy', x: w * 0.4, y: 700, holdY: 330, opts: {} },
      ...column(6, 0, 760, 95, 0.55, 'kamikaze'),
      ...vFormation(-w * 0.5, 4, 110, 780, 0.4, 'scout').map((e) => ({ ...e, t: e.t + 5 })),
      ...vFormation(w * 0.5, 4, 110, 780, 0.4, 'scout').map((e) => ({ ...e, t: e.t + 5.6 })),
    ],
  },
  {
    name: 'WAVE 4 · CROSS FIRE',
    build: (w) => [
      { t: 0, type: 'interceptor', x: -w - 120, y: 620, holdY: 300, opts: { side: 'left', targetX: -w * 0.5 } },
      { t: 0.3, type: 'interceptor', x: w + 120, y: 620, holdY: 300, opts: { side: 'right', targetX: w * 0.5 } },
      { t: 1.6, type: 'ufo', x: -w - 120, y: 720, holdY: 380, opts: { side: 'left', targetX: -w * 0.28 } },
      { t: 1.9, type: 'ufo', x: w + 120, y: 720, holdY: 380, opts: { side: 'right', targetX: w * 0.28 } },
      ...vFormation(0, 7, 130, 660, 0.3, 'scout').map((e) => ({ ...e, t: e.t + 3.4 })),
      ...line(3, -w * 0.5, w * 0.5, 690, 0.8, 'interceptor', 260).map((e) => ({ ...e, t: e.t + 7 })),
    ],
  },
  {
    name: 'WAVE 5 · DRONE SWARM',
    build: (w) => [
      ...column(5, -w * 0.3, 760, 90, 0.4, 'kamikaze'),
      ...column(5, w * 0.3, 760, 90, 0.4, 'kamikaze').map((e) => ({ ...e, t: e.t + 0.2 })),
      ...column(4, 0, 800, 100, 0.45, 'kamikaze').map((e) => ({ ...e, t: e.t + 2.4 })),
      ...line(4, -w * 0.7, w * 0.7, 640, 0.6, 'interceptor', 240).map((e) => ({ ...e, t: e.t + 4.6 })),
      ...vFormation(0, 6, 140, 700, 0.32, 'scout').map((e) => ({ ...e, t: e.t + 8 })),
    ],
  },
  {
    name: 'WAVE 6 · ELITE ESCORT',
    build: (w) => [
      { t: 0, type: 'elite', x: -w * 0.45, y: 720, holdY: 360, opts: {} },
      { t: 0.5, type: 'elite', x: w * 0.45, y: 720, holdY: 360, opts: {} },
      { t: 2, type: 'heavy', x: -w * 0.15, y: 760, holdY: 300, opts: {} },
      { t: 2.4, type: 'heavy', x: w * 0.15, y: 760, holdY: 300, opts: {} },
      ...line(4, -w * 0.6, w * 0.6, 680, 0.7, 'interceptor', 280).map((e) => ({ ...e, t: e.t + 3.5 })),
      ...column(4, -w * 0.65, 760, 95, 0.5, 'kamikaze').map((e) => ({ ...e, t: e.t + 7 })),
      ...column(4, w * 0.65, 760, 95, 0.5, 'kamikaze').map((e) => ({ ...e, t: e.t + 7.4 })),
      ...vFormation(0, 7, 130, 700, 0.3, 'scout').map((e) => ({ ...e, t: e.t + 10 })),
    ],
  },
];

export class WaveSystem {
  constructor() {
    this.waveIndex = -1;
    this.queue = [];
    this.elapsed = 0;
    this.state = 'idle'; // idle | spawning | clearing | done
    this.betweenTimer = 0;
    this.bossWave = false;
  }

  get currentWave() {
    return this.waveIndex + 1;
  }

  start() {
    this.waveIndex = -1;
    this.state = 'idle';
    this.betweenTimer = 0.8;
    this.bossWave = false;
  }

  /* devuelve el nombre de la oleada cuando comienza, o null */
  update(dt, halfW, enemiesAlive) {
    this.elapsed += dt;
    let startedWaveName = null;

    if (this.state === 'idle') {
      this.betweenTimer -= dt;
      if (this.betweenTimer <= 0) {
        this.waveIndex++;
        if (this.waveIndex >= WAVES.length) {
          // ¡Jefe!
          this.state = 'boss';
          this.bossWave = true;
          return { waveName: 'FINAL · COLOSSUS APPROACHING', boss: true, finished: false };
        }
        const def = WAVES[this.waveIndex];
        this.queue = def
          .build(halfW)
          .slice()
          .sort((a, b) => a.t - b.t);
        this.elapsed = 0;
        this.state = 'spawning';
        startedWaveName = def.name;
      }
      return { waveName: startedWaveName, boss: false, finished: false };
    }

    if (this.state === 'spawning') {
      while (this.queue.length && this.queue[0].t <= this.elapsed) {
        const ev = this.queue.shift();
        this.onSpawn && this.onSpawn(ev);
      }
      if (this.queue.length === 0) {
        this.state = 'clearing';
      }
      return { waveName: null, boss: false, finished: false };
    }

    if (this.state === 'clearing') {
      if (enemiesAlive === 0) {
        this.state = 'idle';
        this.betweenTimer = 2.6;
      }
      return { waveName: null, boss: false, finished: false };
    }

    if (this.state === 'boss') {
      return { waveName: null, boss: true, finished: false };
    }

    return { waveName: null, boss: false, finished: false };
  }

  reset() {
    this.waveIndex = -1;
    this.queue = [];
    this.state = 'idle';
    this.betweenTimer = 0.8;
    this.bossWave = false;
    this.elapsed = 0;
  }
}
