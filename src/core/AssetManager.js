/* ============================================================
   AssetManager — carga de texturas (Three.js) y buffers de audio
   ============================================================ */

import * as THREE from 'three';

const TEXTURES = {
  // jugador / balas
  player: '/assets/sprites/player.png',
  playerDamage1: '/assets/sprites/player_damage1.png',
  playerDamage2: '/assets/sprites/player_damage2.png',
  playerDamage3: '/assets/sprites/player_damage3.png',
  laserPlayer: '/assets/sprites/laser_player.png',
  laserBig: '/assets/sprites/laser_big.png',
  laserEnemy: '/assets/sprites/laser_enemy.png',
  laserEnemy2: '/assets/sprites/laser_enemy2.png',

  // enemigos
  scout: '/assets/enemies/scout.png',
  interceptor: '/assets/enemies/interceptor.png',
  heavy: '/assets/enemies/heavy.png',
  kamikaze: '/assets/enemies/kamikaze.png',
  elite: '/assets/enemies/elite.png',
  ufo: '/assets/enemies/ufo.png',
  meteor: '/assets/enemies/meteor_big.png',
  meteorSmall: '/assets/enemies/meteor_small.png',

  // power-ups
  puHealth: '/assets/sprites/pu_health.png',
  puShield: '/assets/sprites/pu_shield.png',
  puWeapon: '/assets/sprites/pu_weapon.png',
  puSpeed: '/assets/sprites/pu_speed.png',
  puBomb: '/assets/sprites/pu_bomb.png',
  puMulti: '/assets/sprites/pu_multiplier.png',

  // efectos
  shield1: '/assets/effects/shield1.png',
  shield2: '/assets/effects/shield2.png',
  shield3: '/assets/effects/shield3.png',
  shieldBubble: '/assets/effects/shield_bubble.png',
  spark: '/assets/effects/spark.png',
  speedIcon: '/assets/effects/speed.png',
  blastSmall: '/assets/effects/explosion_sheets/blast_small.png',
  blastBig: '/assets/effects/explosion_sheets/blast_big.png',
  blastFire: '/assets/effects/explosion_sheets/blast_fire.png',
  thruster1: '/assets/effects/thruster/fire00.png',
  thruster2: '/assets/effects/thruster/fire06.png',

  // fondos
  starfield: '/assets/backgrounds/starfield.png',
  starSmall: '/assets/backgrounds/star_small.png',
  starBig: '/assets/backgrounds/star_big.png',
  nebula: '/assets/backgrounds/nebula.png',
  speedline: '/assets/backgrounds/speedline.png',
  bgColor: '/assets/backgrounds/bg_color.png',
  planet0: '/assets/backgrounds/planets/planet00.png',
  planet1: '/assets/backgrounds/planets/planet03.png',
  planet2: '/assets/backgrounds/planets/planet07.png',

  // jefe
  boss: '/assets/boss/station_a.png',
  bossWing: '/assets/boss/station_b.png',
};

const SFX = [
  'laser_player', 'laser_enemy', 'laser_beam', 'zap',
  'explosion_small', 'explosion_big', 'explosion_huge',
  'hit_player', 'hit_enemy', 'shield_hit', 'shield_up', 'shield_down',
  'powerup', 'twotone', 'lose', 'thruster', 'boss_warning', 'boss_engine',
  'ui_click', 'ui_back', 'ui_error', 'ui_start',
];

const MUSIC = ['menu', 'combat', 'boss', 'ambient'];

export class AssetManager {
  constructor() {
    this.textures = {};
    this.audioBuffers = {}; // nombre -> ArrayBuffer (decodifica AudioSystem)
    this.musicUrls = {};
    this.loader = new THREE.TextureLoader();
    this.total = 0;
    this.loaded = 0;
    this.onProgress = null;
  }

  _tick(label) {
    this.loaded++;
    if (this.onProgress) this.onProgress(this.loaded / this.total, label);
  }

  async loadAll() {
    const texEntries = Object.entries(TEXTURES);
    const sfxEntries = SFX.map((n) => [n, `/assets/audio/sfx/${n}.ogg`]);
    const musicEntries = MUSIC.map((n) => [n, `/assets/audio/music/${n}.${n === 'boss' || n === 'ambient' ? 'mp3' : 'ogg'}`]);

    this.total = texEntries.length + sfxEntries.length + musicEntries.length;
    this.loaded = 0;

    const jobs = [];

    for (const [key, url] of texEntries) {
      jobs.push(
        this._loadTexture(key, url).then(() => this._tick(url.split('/').pop()))
      );
    }

    for (const [key, url] of sfxEntries) {
      jobs.push(
        fetch(url)
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
          .then((buf) => { this.audioBuffers[key] = buf; })
          .catch(() => { this.audioBuffers[key] = null; })
          .finally(() => this._tick(url.split('/').pop()))
      );
    }

    for (const [key, url] of musicEntries) {
      // La música se sirve como elemento <audio> (streaming); se registra
      // directamente para no provocar peticiones abortadas por el navegador
      this.musicUrls[key] = url;
      this._tick(url.split('/').pop());
    }

    await Promise.all(jobs);
    return this;
  }

  _loadTexture(key, url) {
    return new Promise((resolve) => {
      this.loader.load(
        url,
        (tex) => {
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.generateMipmaps = true;
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          this.textures[key] = tex;
          resolve(tex);
        },
        undefined,
        () => {
          // textura opcional ausente: se resuelve para no bloquear la carga
          resolve(null);
        }
      );
    });
  }

  tex(key) { return this.textures[key] || null; }
  buffer(key) { return this.audioBuffers[key] || null; }
}
