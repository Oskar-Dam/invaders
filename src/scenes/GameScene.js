/* ============================================================
   GameScene — orquesta una partida completa:
   jugador, enemigos, oleadas, jefe, colisiones, power-ups,
   puntuación, efectos y condiciones de victoria/derrota
   ============================================================ */

import * as THREE from 'three';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { ProjectileSystem } from '../entities/Projectile.js';
import { PowerUpSystem } from '../entities/PowerUp.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { FXSystem } from '../systems/FXSystem.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { WaveSystem, WAVES } from '../systems/WaveSystem.js';
import { circleHit } from '../systems/CollisionSystem.js';
import { BOSS, PLAYER, POWERUPS } from '../core/config.js';

const ENEMY_POOL = 52;
const rand = (a, b) => a + Math.random() * (b - a);

export class GameScene {
  constructor(ctx) {
    this.ctx = ctx; // { renderer, assets, input, audio, hud, settings, callbacks }
    const scene = ctx.renderer.scene;

    this.particles = new ParticleSystem(scene, ctx.assets);
    this.fx = new FXSystem(scene, ctx.assets);
    this.projectiles = new ProjectileSystem(scene, ctx.assets);
    this.powerups = new PowerUpSystem(scene, ctx.assets);
    this.score = new ScoreSystem();
    this.waves = new WaveSystem();

    // pool de enemigos
    this.enemies = [];
    for (let i = 0; i < ENEMY_POOL; i++) {
      const e = new Enemy(scene, ctx.assets);
      e.setVisible(false);
      this.enemies.push(e);
    }

    this.player = new Player(scene, ctx.assets, this.particles);
    this.boss = new Boss(scene, ctx.assets);

    // rayo especial del jugador
    this.beamMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: 0x8ff6ff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.beamMesh.position.z = 9;
    this.beamMesh.visible = false;
    scene.add(this.beamMesh);
    this.beam = null;

    this.state = 'idle'; // idle | playing | dying | victory
    this.bombs = 0;
    this.waveNumber = 1;
    this.bossSpawned = false;
    this.deathTimer = 0;
    this.victoryTimer = 0;
    this._beamDpsTimer = 0;

    this.waves.onSpawn = (ev) => this._spawnFromEvent(ev);
  }

  /* =========================================================
     Ciclo de partida
     ========================================================= */
  start() {
    const s = this.score;
    s.reset();
    this.player.reset();
    this.projectiles.clear();
    this.powerups.clear();
    this.particles.clear();
    this.fx.clear();
    for (const e of this.enemies) e.setVisible(false);
    this.boss.active = false;
    this.boss.group.visible = false;
    this.beam = null;
    this.beamMesh.visible = false;
    this.bombs = 1;
    this.bossSpawned = false;
    this.deathTimer = 0;
    this.victoryTimer = 0;
    this.waveNumber = 1;
    this.state = 'playing';

    this.waves.reset();
    this.waves.start();

    const hud = this.ctx.hud;
    hud.reset();
    hud.setRecord(this.score.record);
    hud.setBombs(this.bombs);
    hud.setWeapon(this.player.weapon.name, this.player.weapon.icon);

    this.ctx.audio.playMusic('combat');
  }

  pause() {
    this.state = 'paused';
  }

  resume() {
    if (this.state === 'paused') this.state = 'playing';
  }

  /* =========================================================
     Spawn de enemigos
     ========================================================= */
  _freeEnemy() {
    return this.enemies.find((e) => !e.alive) || null;
  }

  _spawnFromEvent(ev) {
    const e = this._freeEnemy();
    if (!e) return;
    e.spawn(ev.type, ev.x, ev.y, this.waveNumber, ev.opts || {});
    if (ev.holdY !== undefined && ev.holdY !== null) e.holdY = ev.holdY;
    // entrada lateral
    if (ev.opts && ev.opts.side) {
      e.holdY = ev.holdY;
      e.baseX = ev.opts.targetX;
    }
  }

  /* =========================================================
     Daño y muerte
     ========================================================= */
  _damagePlayer(amount) {
    const p = this.player;
    if (!p.alive || p.invuln > 0) return;
    const wasShield = p.shield;
    p.takeDamage(amount);
    const hud = this.ctx.hud;

    if (p.shield < wasShield && p.shield > 0) {
      this.ctx.audio.playSfx('shield_hit', { rate: rand(0.9, 1.1), gain: 0.8 });
    } else {
      this.ctx.audio.playSfx('hit_player', { rate: rand(0.9, 1.1), gain: 0.9 });
    }
    this.particles.sparks(p.x, p.y, 0xff6a5a);
    if (this._shake()) this.ctx.renderer.addShake(14, 0.3);
    this.score.breakCombo();

    hud.setHealth(p.health / PLAYER.maxHealth);
    hud.setShield(p.shield / PLAYER.maxShield);

    if (!p.alive) this._killPlayer();
  }

  _shake() {
    return this.ctx.settings().shake;
  }

  _killPlayer() {
    const p = this.player;
    p.sprite.visible = false;
    p.damageOverlay.visible = false;
    p.thruster.visible = false;
    p.shieldSprite.visible = false;
    this.state = 'dying';
    this.deathTimer = 1.7;
    this.fx.explosion(p.x, p.y, 340, 0);
    this.fx.ring(p.x, p.y, 40, 480, 0.7, 0x4ff0ff);
    this.particles.explosion(p.x, p.y, true);
    this.ctx.audio.playSfx('explosion_huge', { gain: 0.9 });
    this.ctx.audio.playSfx('lose', { gain: 0.8 });
    this.fx.stop(0.18);
    if (this._shake()) this.ctx.renderer.addShake(30, 0.6);
    this.ctx.audio.stopMusic(0.6);
  }

  _killEnemy(e, { rammed = false } = {}) {
    if (!e.alive && e.hp > 0) return;
    e.alive = false;
    e.setVisible(false);

    const big = e.type === 'heavy' || e.type === 'elite';
    this.fx.explosion(e.x, e.y, big ? 260 : 150, (Math.random() * 3) | 0);
    if (big) this.fx.ring(e.x, e.y, 20, 240, 0.5, 0xff9d3f);
    this.particles.explosion(e.x, e.y, big);
    this.ctx.audio.playSfx(big ? 'explosion_big' : 'explosion_small', {
      rate: rand(0.9, 1.15),
      gain: big ? 0.8 : 0.6,
    });

    if (e.onKamikazeHit && e.onKamikazeHit()) {
      // kamikaze: daña al jugador si está cerca
      if (circleHit(e.x, e.y, e.radius + 30, this.player.x, this.player.y, PLAYER.radius)) {
        this._damagePlayer(e.touchDamage);
      }
    }

    const { gained, mult } = this.score.addKill(e.score);
    this.fx.floatText(e.x, e.y, `+${gained}`, mult > 1 ? '#ffd23f' : '#9ff6ff', mult > 2 ? 26 : 20);
    if (this._shake()) this.ctx.renderer.addShake(big ? 8 : 3, 0.16);

    // drop de power-up
    const chance = big ? 0.45 : rammed ? 0.1 : 0.16;
    if (Math.random() < chance) this.powerups.spawn(e.x, e.y);
  }

  _collectPowerUp(type, x, y) {
    const p = this.player;
    const cfg = POWERUPS[type];
    const audio = this.ctx.audio;
    const hud = this.ctx.hud;

    audio.playSfx('powerup', { rate: rand(0.95, 1.1), gain: 0.9 });
    this.particles.spawn(x, y, {
      count: 16, speed: 260, speedVar: 140, life: 0.5, lifeVar: 0.2,
      size: 20, sizeVar: 8, color: cfg.color, drag: 3,
    });
    this.fx.ring(x, y, 20, 170, 0.4, cfg.color);

    let label = cfg.label;
    switch (type) {
      case 'health':
        p.health = Math.min(PLAYER.maxHealth, p.health + 30);
        label = 'REPAIR +30';
        break;
      case 'shield':
        p.shield = Math.min(PLAYER.maxShield, p.shield + 25);
        label = 'SHIELD +25';
        break;
      case 'weapon':
        if (p.cycleWeaponUp()) label = `${p.weapon.name} LV${p.weaponLevel}`;
        else { this.score.addScore(500); label = 'MAX WEAPON +500'; }
        audio.playSfx('twotone', { gain: 0.7 });
        hud.setWeapon(p.weapon.name, p.weapon.icon);
        break;
      case 'speed':
        p.speedBoost = 7;
        label = 'SPEED UP';
        break;
      case 'bomb':
        this.bombs = Math.min(3, this.bombs + 1);
        label = 'NOVA BOMB +1';
        break;
      case 'multi':
        this.score.activateBoost(12);
        label = 'x2 SCORE';
        break;
      default:
        break;
    }

    this.fx.floatText(x, y + 30, label, `#${cfg.color.toString(16).padStart(6, '0')}`, 20);
    hud.setHealth(p.health / PLAYER.maxHealth);
    hud.setShield(p.shield / PLAYER.maxShield);
    hud.setBombs(this.bombs);
  }

  _useBomb() {
    if (this.bombs <= 0 || this.state !== 'playing') return false;
    this.bombs--;
    this.ctx.hud.setBombs(this.bombs);

    const p = this.player;
    this.fx.ring(p.x, p.y, 60, Math.max(this.ctx.renderer.halfW, 700) * 2.2, 0.9, 0xffd23f);
    this.particles.explosion(p.x, p.y, true);
    this.projectiles.clearEnemyBullets();
    this.ctx.audio.playSfx('explosion_huge', { gain: 1 });
    this.fx.stop(0.14);
    if (this._shake()) this.ctx.renderer.addShake(26, 0.5);

    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.damage(200)) this._killEnemy(e);
      else {
        this.particles.sparks(e.x, e.y, 0xffd23f);
      }
    }
    if (this.boss.active && this.boss.state === 'fight') {
      const r = this.boss.damage(220);
      if (r === 'phase') this._bossPhaseChange();
      else if (r === 'dying') this._bossDying();
    }
    return true;
  }

  _useSpecial() {
    const p = this.player;
    if (p.specialCharges <= 0 || this.state !== 'playing') return false;
    p.specialCharges--;
    p.specialRegen = 0;
    this.beam = { x: p.x, t: 0, dur: 0.75, halfWidth: 78 };
    this.beamMesh.visible = true;
    this.beamMesh.position.set(p.x, 0, 9);
    this.ctx.audio.playSfx('laser_beam', { rate: 1, gain: 1 });
    if (this._shake()) this.ctx.renderer.addShake(10, 0.3);
    return true;
  }

  /* =========================================================
     Jefe
     ========================================================= */
  _spawnBoss() {
    this.bossSpawned = true;
    this.boss.reset(this.ctx.renderer.halfH);
    this.ctx.hud.setBoss(true, 1, BOSS.name);
    this.ctx.hud.showBanner('⚠ COLOSSUS INCOMING ⚠', 2.6);
    this.ctx.audio.playMusic('boss');
    this.ctx.audio.playSfx('boss_warning', { gain: 0.9 });
    this.ctx.background.setBoost(1.6);
  }

  _bossPhaseChange() {
    // this.boss.phase ya fue actualizado por Boss.damage()
    const phase = this.boss.phase;
    this.ctx.hud.showBanner(`COLOSSUS · PHASE ${phase}`, 1.8);
    this.ctx.audio.playSfx('boss_warning', { rate: 1.3, gain: 0.9 });
    this.fx.ring(this.boss.x, this.boss.y, 60, 620, 0.7, 0xff3ea5);
    if (this._shake()) this.ctx.renderer.addShake(18, 0.4);
  }

  _bossDying() {
    this.fx.stop(0.35);
    if (this._shake()) this.ctx.renderer.addShake(34, 1.2);
    this.ctx.hud.showBanner('COLOSSUS DESTABILIZADO', 2);
    this.ctx.audio.stopMusic(1.2);
    this.projectiles.clearEnemyBullets();
  }

  onBossExplosion = (x, y) => {
    this.fx.explosion(x, y, rand(200, 340), (Math.random() * 3) | 0);
    this.particles.explosion(x, y, true);
    this.ctx.audio.playSfx('explosion_big', { rate: rand(0.85, 1.1), gain: 0.8 });
    if (this._shake()) this.ctx.renderer.addShake(12, 0.35);
  };

  onBossDeath = () => {
    this.fx.explosion(this.boss.x, this.boss.y, 620, 1);
    this.fx.ring(this.boss.x, this.boss.y, 60, 900, 1.1, 0xffd23f);
    this.particles.explosion(this.boss.x, this.boss.y, true);
    this.ctx.audio.playSfx('explosion_huge', { gain: 1 });
    this.score.addScore(BOSS.score);
    this.fx.floatText(this.boss.x, this.boss.y, `+${BOSS.score}`, '#ffd23f', 34);
    this.ctx.hud.setBoss(false, 0);
    this.state = 'victory';
    this.victoryTimer = 2.4;
    this.ctx.background.setBoost(2.5);
    this.fx.stop(0.3);
    if (this._shake()) this.ctx.renderer.addShake(40, 1);
  };

  /* =========================================================
     Update principal
     ========================================================= */
  update(dt) {
    const ctx = this.ctx;
    const renderer = ctx.renderer;
    const halfW = renderer.halfW;
    const halfH = renderer.halfH;

    if (this.state === 'idle' || this.state === 'paused') return;

    // hit-stop: congela la lógica un instante (solo efectos siguen)
    if (this.fx.consumeHitStop(dt)) {
      this.fx.update(dt, halfW, halfH);
      this.particles.update(dt);
      return;
    }

    const p = this.player;
    const playerCtx = {
      halfW,
      halfH,
      autofire: ctx.settings().autofire,
      particlesEnabled: ctx.settings().particles,
      audio: ctx.audio,
      projectiles: this.projectiles,
      particles: this.particles,
    };

    // ---- jugador ----
    if (this.state === 'playing' && p.alive) {
      // entrada especial / bomba
      if (ctx.input.consumeSpecial()) {
        if (!this._useSpecial()) {
          if (this.bombs > 0) this._useBomb();
          else ctx.audio.playSfx('ui_error', { gain: 0.5 });
        }
      }
      const wk = ctx.input.consumeWeaponKey();
      if (wk) {
        p.selectWeapon(wk);
        ctx.hud.setWeapon(p.weapon.name, p.weapon.icon);
        ctx.audio.playSfx('ui_click', { rate: 1.4, gain: 0.5 });
      }
      p.update(dt, ctx.input, playerCtx);
    }

    // red de seguridad: si el jugador murió por fuera de _damagePlayer
    if (this.state === 'playing' && !p.alive) {
      this._killPlayer();
    }

    // ---- oleadas ----
    if (this.state === 'playing') {
      const res = this.waves.update(dt, halfW, this._aliveEnemies());
      if (res.waveName) {
        this.waveNumber = this.waves.currentWave;
        ctx.hud.setWave(this.waveNumber);
        ctx.hud.showBanner(res.waveName);
        ctx.audio.playSfx('ui_start', { gain: 0.7 });
        ctx.background.setBoost(1.5);
      }
      if (res.boss && !this.bossSpawned) this._spawnBoss();
    }

    // ---- enemigos ----
    const enemyCtx = {
      halfW,
      halfH,
      playerX: p.x,
      playerY: p.y,
      particles: this.particles,
      particlesEnabled: ctx.settings().particles,
      audio: ctx.audio,
      spawnEnemyBullet: (x, y, vx, vy, opts) => this.projectiles.spawnEnemy(x, y, vx, vy, opts || {}),
    };

    for (const e of this.enemies) {
      if (!e.alive) continue;
      const wasAlive = e.alive;
      e.update(dt, enemyCtx);
      if (wasAlive && !e.alive) {
        if (e.hp <= 0) this._killEnemy(e, { rammed: false });
        // si salió de pantalla sin morir: simplemente se recicla
      }
    }

    // ---- proyectiles ----
    this.projectiles.update(dt, halfW, halfH, { x: p.x, y: p.y });

    // ---- colisiones ----
    if (this.state === 'playing' || this.state === 'dying') {
      this._collisions(dt);
    }

    // ---- power-ups ----
    if (this.state === 'playing') {
      this.powerups.update(dt, p.x, p.y, (t, x, y) => this._collectPowerUp(t, x, y), halfH);
    }

    // ---- rayo especial ----
    if (this.beam) {
      this.beam.t += dt;
      this.beam.x = p.x;
      const k = this.beam.t / this.beam.dur;
      this.beamMesh.position.set(this.beam.x, 0, 9);
      const w = this.beam.halfWidth * (1 + k * 1.2);
      this.beamMesh.scale.set(w, halfH * 2, 1);
      const mat = this.beamMesh.material;
      mat.color.setHex(0x66e6ff);
      mat.opacity = (k < 0.15 ? k / 0.15 : Math.max(0, 1 - (k - 0.15) / 0.85)) * 0.55;

      // daño continuo
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (Math.abs(e.x - this.beam.x) < w / 2 + e.radius) {
          if (e.damage(780 * dt)) this._killEnemy(e);
          else if (Math.random() < dt * 30) this.particles.sparks(e.x, e.y, 0x8ff6ff);
        }
      }
      if (this.boss.active && this.boss.state === 'fight' &&
          Math.abs(this.boss.x - this.beam.x) < w / 2 + this.boss.radius * 0.7) {
        const r = this.boss.damage(420 * dt);
        if (r === 'phase') this._bossPhaseChange();
        else if (r === 'dying') this._bossDying();
      }
      // destruye balas enemigas en la banda
      for (const b of this.projectiles.enemyBullets) {
        if (Math.abs(b.position.x - this.beam.x) < w / 2) this.projectiles.kill(b);
      }

      if (this.beam.t >= this.beam.dur) {
        this.beam = null;
        this.beamMesh.visible = false;
      }
    }

    // ---- jefe ----
    if (this.boss.active) {
      const bossCtx = {
        halfW,
        halfH,
        playerX: p.x,
        playerY: p.y,
        particles: this.particles,
        particlesEnabled: ctx.settings().particles,
        audio: ctx.audio,
        spawnEnemyBullet: (x, y, vx, vy, opts) => this.projectiles.spawnEnemy(x, y, vx, vy, opts || {}),
        onBossExplosion: this.onBossExplosion,
        onBossDeath: this.onBossDeath,
      };
      const prevState = this.boss.state;
      this.boss.update(dt, bossCtx);
      if (prevState === 'enter' && this.boss.state === 'fight') {
        ctx.hud.showBanner(BOSS.name, 2);
      }
      ctx.hud.setBoss(true, this.boss.hpFraction, BOSS.name);

      // barrido láser contra el jugador (colisión swept: el rayo recorre
      // varios px por frame, así no se salta al jugador en pantallas lentas)
      if (this.boss.beam.active && p.alive && p.invuln <= 0) {
        const bm = this.boss.beam;
        const prev = bm.prevX ?? bm.x;
        const pad = bm.halfWidth + PLAYER.radius * 0.5;
        const lo = Math.min(prev, bm.x) - pad;
        const hi = Math.max(prev, bm.x) + pad;
        if (p.x >= lo && p.x <= hi) {
          this._damagePlayer(20);
        }
      }
      // contacto con el cuerpo
      if (p.alive && this.boss.state === 'fight' &&
          circleHit(p.x, p.y, PLAYER.radius, this.boss.x, this.boss.y, this.boss.radius * 0.72)) {
        this._damagePlayer(24);
      }
    }

    // ---- puntuación / HUD ----
    this.score.update(dt);
    const hud = ctx.hud;
    hud.setScore(this.score.displayScore);
    hud.setMultiplier(this.score.multiplier, this.score.hasBoost);
    hud.setCombo(this.score.combo, this.score.multiplier);
    hud.setHealth(p.health / PLAYER.maxHealth);
    hud.setShield(p.shield / PLAYER.maxShield);
    hud.setSpecial(p.specialCharges, PLAYER.specialMax, p.specialRegen / PLAYER.specialRegen);
    hud.setRecord(this.score.record);

    // ---- efectos ----
    this.particles.update(dt);
    this.fx.update(dt, halfW, halfH);

    // ---- fin de partida ----
    if (this.state === 'dying') {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        this.state = 'gameover';
        const newRecord = this.score.checkRecord();
        ctx.callbacks.onGameOver({
          score: this.score.score,
          record: this.score.record,
          wave: this.waveNumber,
          kills: this.score.kills,
          newRecord,
        });
      }
    }

    if (this.state === 'victory') {
      this.victoryTimer -= dt;
      if (this.victoryTimer <= 0) {
        this.state = 'finished';
        const newRecord = this.score.checkRecord();
        ctx.callbacks.onVictory({
          score: this.score.score,
          record: this.score.record,
          kills: this.score.kills,
          newRecord,
        });
      }
    }
  }

  _aliveEnemies() {
    let n = 0;
    for (const e of this.enemies) if (e.alive) n++;
    return n;
  }

  /* =========================================================
     Colisiones
     ========================================================= */
  _collisions(dt) {
    const p = this.player;
    const proj = this.projectiles;
    const pBullets = proj.playerBullets;
    const eBullets = proj.enemyBullets;

    // --- balas del jugador vs enemigos ---
    for (const b of pBullets) {
      const bd = b.userData;
      let consumed = false;

      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (circleHit(b.position.x, b.position.y, bd.radius, e.x, e.y, e.radius)) {
          const dead = e.damage(bd.dmg);
          this.particles.sparks(b.position.x, b.position.y + 10, 0xffd23f);
          this.ctx.audio.playSfx('hit_enemy', { rate: rand(1.1, 1.5), gain: 0.28 });
          proj.kill(b);
          consumed = true;
          if (dead) this._killEnemy(e);
          break;
        }
      }
      if (consumed) continue;

      // --- balas del jugador vs jefe ---
      if (this.boss.active && this.boss.state === 'fight') {
        if (circleHit(b.position.x, b.position.y, bd.radius, this.boss.x, this.boss.y, this.boss.radius)) {
          const r = this.boss.damage(bd.dmg);
          this.particles.sparks(b.position.x, b.position.y, 0xff8ce0);
          this.ctx.audio.playSfx('hit_enemy', { rate: rand(0.7, 1.0), gain: 0.35 });
          proj.kill(b);
          if (r === 'phase') this._bossPhaseChange();
          else if (r === 'dying') this._bossDying();
        }
      }
    }

    if (this.state !== 'playing' || !p.alive) return;

    // --- balas enemigas vs jugador ---
    for (const b of eBullets) {
      const bd = b.userData;
      if (circleHit(b.position.x, b.position.y, bd.radius, p.x, p.y, PLAYER.radius)) {
        proj.kill(b);
        this._damagePlayer(bd.dmg);
        if (!p.alive) return;
      }
    }

    // --- enemigos vs jugador (embestida) ---
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (circleHit(e.x, e.y, e.radius, p.x, p.y, PLAYER.radius)) {
        this._damagePlayer(e.touchDamage);
        if (e.type === 'kamikaze' || e.hp <= e.maxHp * 0.25) {
          e.hp = 0;
          this._killEnemy(e, { rammed: true });
        } else {
          e.damage(e.maxHp * 0.4);
          if (e.hp <= 0) this._killEnemy(e, { rammed: true });
        }
        if (!p.alive) return;
      }
    }
  }

  /* =========================================================
     Limpieza
     ========================================================= */
  destroy() {
    this.projectiles.clear();
    this.powerups.clear();
    this.particles.clear();
    this.fx.clear();
    for (const e of this.enemies) e.setVisible(false);
    this.boss.active = false;
    this.boss.group.visible = false;
    this.beam = null;
    this.beamMesh.visible = false;
    this.player.reset();
    this.state = 'idle';
  }
}
