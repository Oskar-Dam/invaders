/* ============================================================
   Configuración global de NEBULA STRIKE
   Resolución de diseño: Full HD 1920x1080 (16:9)
   ============================================================ */

export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;
export const HALF_H = DESIGN_HEIGHT / 2; // 540

export const PALETTE = {
  cyan: 0x4ff0ff,
  white: 0xffffff,
  red: 0xff4b3e,
  magenta: 0xff3ea5,
  orange: 0xff9d3f,
  green: 0x5dff8a,
  yellow: 0xffd23f,
  violet: 0xa06bff,
  blue: 0x2f8bff,
};

/* ---------------- Jugador ---------------- */
export const PLAYER = {
  speed: 640,
  accel: 5200,
  friction: 6400,
  radius: 30,
  maxHealth: 100,
  maxShield: 50,
  invulnTime: 1.4,
  fireCooldown: 0.13,
  specialMax: 3,
  specialRegen: 6.5, // segundos por carga
};

/* ---------------- Armas ---------------- */
export const WEAPONS = [
  {
    id: 'laser',
    name: 'PULSE LASER',
    icon: '/assets/sprites/laser_player.png',
    cooldown: 0.13,
    // por nivel: offsets x, ángulo en grados, daño, escala
    levels: [
      [{ x: 0, angle: 0, dmg: 12, scale: 1.5 }],
      [{ x: -22, angle: 0, dmg: 11, scale: 1.4 }, { x: 22, angle: 0, dmg: 11, scale: 1.4 }],
      [{ x: -26, angle: -6, dmg: 12, scale: 1.5 }, { x: 0, angle: 0, dmg: 14, scale: 1.7 }, { x: 26, angle: 6, dmg: 12, scale: 1.5 }],
    ],
    sfx: 'laser_player',
    pitch: [0.95, 1.15],
  },
  {
    id: 'triple',
    name: 'TRIPLE SPREAD',
    icon: '/assets/sprites/pu_weapon.png',
    cooldown: 0.16,
    levels: [
      [{ x: 0, angle: 0, dmg: 9, scale: 1.4 }, { x: -18, angle: -14, dmg: 9, scale: 1.3 }, { x: 18, angle: 14, dmg: 9, scale: 1.3 }],
      [{ x: -14, angle: -6, dmg: 10, scale: 1.4 }, { x: 0, angle: 0, dmg: 11, scale: 1.5 }, { x: 14, angle: 6, dmg: 10, scale: 1.4 }, { x: -30, angle: -22, dmg: 8, scale: 1.2 }, { x: 30, angle: 22, dmg: 8, scale: 1.2 }],
      [{ x: -14, angle: -5, dmg: 12, scale: 1.5 }, { x: 0, angle: 0, dmg: 13, scale: 1.6 }, { x: 14, angle: 5, dmg: 12, scale: 1.5 }, { x: -34, angle: -24, dmg: 9, scale: 1.2 }, { x: 34, angle: 24, dmg: 9, scale: 1.2 }],
    ],
    sfx: 'laser_enemy',
    pitch: [1.3, 1.6],
  },
  {
    id: 'heavy',
    name: 'HEAVY BEAM',
    icon: '/assets/sprites/laser_big.png',
    cooldown: 0.22,
    levels: [
      [{ x: -24, angle: 0, dmg: 20, scale: 2.1 }, { x: 24, angle: 0, dmg: 20, scale: 2.1 }],
      [{ x: -34, angle: -3, dmg: 22, scale: 2.2 }, { x: -12, angle: 0, dmg: 22, scale: 2.2 }, { x: 12, angle: 0, dmg: 22, scale: 2.2 }, { x: 34, angle: 3, dmg: 22, scale: 2.2 }],
      [{ x: -40, angle: -5, dmg: 25, scale: 2.4 }, { x: -14, angle: 0, dmg: 26, scale: 2.5 }, { x: 14, angle: 0, dmg: 26, scale: 2.5 }, { x: 40, angle: 5, dmg: 25, scale: 2.4 }],
    ],
    sfx: 'laser_beam',
    pitch: [0.8, 1.0],
  },
];

/* ---------------- Enemigos ---------------- */
export const ENEMIES = {
  scout: {
    tex: '/assets/enemies/scout.png',
    tint: 0xff5a4a,
    scale: 1.05,
    hp: 22,
    speed: 340,
    score: 100,
    radiusScale: 0.34,
    touchDamage: 12,
    behavior: 'scout',
  },
  interceptor: {
    tex: '/assets/enemies/interceptor.png',
    tint: 0xff4fb0,
    scale: 1.2,
    hp: 45,
    speed: 190,
    score: 160,
    radiusScale: 0.34,
    touchDamage: 14,
    behavior: 'interceptor',
    fireCooldown: 1.5,
    bulletSpeed: 460,
  },
  heavy: {
    tex: '/assets/enemies/heavy.png',
    tint: 0xff9d3f,
    scale: 1.85,
    hp: 150,
    speed: 95,
    score: 320,
    radiusScale: 0.32,
    touchDamage: 20,
    behavior: 'heavy',
    fireCooldown: 2.1,
    bulletSpeed: 420,
  },
  kamikaze: {
    tex: '/assets/enemies/kamikaze.png',
    tint: 0xff4433,
    scale: 1.05,
    hp: 26,
    speed: 250,
    score: 200,
    radiusScale: 0.33,
    touchDamage: 26,
    behavior: 'kamikaze',
  },
  elite: {
    tex: '/assets/enemies/elite.png',
    tint: 0xc86bff,
    scale: 1.5,
    hp: 110,
    speed: 210,
    score: 520,
    radiusScale: 0.34,
    touchDamage: 18,
    behavior: 'elite',
    fireCooldown: 1.7,
    bulletSpeed: 520,
  },
  // Apoyo / decorativo
  ufo: {
    tex: '/assets/enemies/ufo.png',
    tint: 0xff4fb0,
    scale: 1.3,
    hp: 60,
    speed: 150,
    score: 240,
    radiusScale: 0.36,
    touchDamage: 15,
    behavior: 'interceptor',
    fireCooldown: 1.9,
    bulletSpeed: 430,
  },
  meteor: {
    tex: '/assets/enemies/meteor_big.png',
    tint: 0xffc9a8,
    scale: 1.6,
    hp: 70,
    speed: 140,
    score: 80,
    radiusScale: 0.36,
    touchDamage: 18,
    behavior: 'meteor',
  },
};

/* ---------------- Power-ups ---------------- */
export const POWERUPS = {
  health:   { tex: '/assets/sprites/pu_health.png',     color: 0x5dff8a, label: 'REPAIR',   weight: 18, duration: 0 },
  shield:   { tex: '/assets/sprites/pu_shield.png',     color: 0x4ff0ff, label: 'SHIELD',   weight: 18, duration: 0 },
  weapon:   { tex: '/assets/sprites/pu_weapon.png',     color: 0x5dff8a, label: 'WEAPON+',  weight: 24, duration: 0 },
  speed:    { tex: '/assets/sprites/pu_speed.png',      color: 0xffd23f, label: 'SPEED UP', weight: 14, duration: 7 },
  bomb:     { tex: '/assets/sprites/pu_bomb.png',       color: 0xff4b3e, label: 'NOVA BOMB',weight: 12, duration: 0 },
  multi:    { tex: '/assets/sprites/pu_multiplier.png', color: 0xa06bff, label: 'x2 SCORE', weight: 14, duration: 12 },
};

/* ---------------- Jefe ---------------- */
export const BOSS = {
  name: 'COLOSSUS // STATION-9',
  tex: '/assets/boss/station_a.png',
  wingTex: '/assets/boss/station_b.png',
  tint: 0xff66c2,
  wingTint: 0xff8ad4,
  scale: 4.2,
  wingScale: 2.3,
  maxHealth: 3200,
  radius: 205,
  score: 15000,
  enterY: 258,
  swaySpeed: 0.55,
  swayAmount: 280,
};

/* ---------------- Dificultad ---------------- */
export function difficulty(wave) {
  const w = Math.max(0, wave - 1);
  return {
    hpMul: 1 + 0.11 * w,
    speedMul: 1 + 0.045 * w,
    fireMul: 1 / (1 + 0.08 * w), // cooldown más corto
    bulletMul: 1 + 0.03 * w,
  };
}

/* ---------------- Almacenamiento ---------------- */
const KEY_RECORD = 'nebula_strike_record';
const KEY_SETTINGS = 'nebula_strike_settings';

export const DEFAULT_SETTINGS = {
  music: 70,
  sfx: 90,
  autofire: false,
  shake: true,
  particles: true,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY_SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY_SETTINGS, JSON.stringify(s)); } catch { /* noop */ }
}

export function loadRecord() {
  try { return parseInt(localStorage.getItem(KEY_RECORD) || '0', 10) || 0; } catch { return 0; }
}

export function saveRecord(v) {
  try { localStorage.setItem(KEY_RECORD, String(v)); } catch { /* noop */ }
}
