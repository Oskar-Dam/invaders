/* ============================================================
   Enemy —5 comportamientos + meteoro/UFO de apoyo
   scout | interceptor | heavy | kamikaze | elite | meteor
   ============================================================ */

import * as THREE from 'three';
import { ENEMIES, difficulty } from '../core/config.js';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

export class Enemy {
  constructor(scene, assets) {
    this.scene = scene;

    this.sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: null, transparent: true, depthWrite: false })
    );
    this.sprite.position.z = 2;
    this.sprite.visible = false;

    this.flash = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: null,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: 0xffffff,
        opacity: 0,
      })
    );
    this.flash.position.z = 3;
    this.flash.visible = false;

    scene.add(this.sprite);
    scene.add(this.flash);

    this._tintA = new THREE.Color();
    this._tintB = new THREE.Color();

    this.alive = false;
    this.assets = assets;
  }

  spawn(type, x, y, wave, opts = {}) {
    const cfg = ENEMIES[type] || ENEMIES.scout;
    const d = difficulty(wave);

    this.type = type;
    this.cfg = cfg;
    this.x = x;
    this.y = y;
    this.baseX = opts.targetX !== undefined ? opts.targetX : x;
    this.holdY = opts.holdY !== undefined ? opts.holdY : null;
    this.hp = Math.round(cfg.hp * d.hpMul);
    this.maxHp = this.hp;
    this.speed = cfg.speed * d.speedMul;
    this.score = cfg.score;
    this.touchDamage = cfg.touchDamage;
    this.fireCooldown = (cfg.fireCooldown || 2) * d.fireMul;
    this.fireTimer = rand(0.3, this.fireCooldown);
    this.bulletSpeed = (cfg.bulletSpeed || 450) * d.bulletMul;
    this.t = rand(0, 10);
    this.phase = 'enter';
    this.vx = 0;
    this.vy = -this.speed;
    this.side = opts.side || null;
    this.hitFlash = 0;
    this.rotation = rand(-0.05, 0.05);
    this.diveTimer = rand(1.6, 3.2);
    this.swayPhase = rand(0, TAU);
    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
    this.contactCooldown = 0;

    const tex = this.assets.tex(cfg.tex.replace('/assets/', '').replace('.png', '').split('/').pop()) || this._texFor(type);
    this.sprite.material.map = tex;
    this.flash.material.map = tex;
    const w = cfg.scale * this._texW(tex, type);
    const h = cfg.scale * this._texH(tex, type);
    this.sprite.scale.set(w, h, 1);
    this.flash.scale.set(w, h, 1);
    this.sprite.material.rotation = this.rotation;
    this.flash.material.rotation = this.rotation;
    this.sprite.material.opacity = 1;
    this.sprite.material.color.setHex(cfg.tint || 0xffffff);
    this.baseTint = cfg.tint || 0xffffff;
    this.sprite.visible = true;
    this.flash.visible = true;
    this.flash.material.opacity = 0;

    this.alive = true;
    this._w = w;
    this._h = h;
    this.radius = w * cfg.radiusScale;
    this.setPosition(this.x, this.y);
  }

  _texFor(type) {
    const map = {
      scout: 'scout', interceptor: 'interceptor', heavy: 'heavy',
      kamikaze: 'kamikaze', elite: 'elite', ufo: 'ufo', meteor: 'meteor',
    };
    return this.assets.tex(map[type] || 'scout');
  }

  _texW(tex, type) {
    const sizes = {
      scout: 93, interceptor: 103, heavy: 82, kamikaze: 104,
      elite: 97, ufo: 94, meteor: 100,
    };
    return sizes[type] || (tex && tex.image ? tex.image.width : 96);
  }

  _texH(tex, type) {
    const sizes = {
      scout: 84, interceptor: 84, heavy: 84, kamikaze: 84,
      elite: 84, ufo: 70, meteor: 100,
    };
    return sizes[type] || (tex && tex.image ? tex.image.height : 84);
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.sprite.position.set(x, y, 2);
    this.flash.position.set(x, y, 3);
  }

  damage(amount) {
    this.hp -= amount;
    this.hitFlash = 0.12;
    if (this.hp <= 0) return true; // muerto
    return false;
  }

  /* ---------- actualización ---------- */
  update(dt, ctx) {
    if (!this.alive) return;
    this.t += dt;
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      this.flash.material.opacity = Math.max(0, this.hitFlash / 0.12) * 0.9;
    } else {
      this.flash.material.opacity = 0;
    }

    switch (this.cfg.behavior) {
      case 'scout': this._scout(dt, ctx); break;
      case 'interceptor': this._interceptor(dt, ctx); break;
      case 'heavy': this._heavy(dt, ctx); break;
      case 'kamikaze': this._kamikaze(dt, ctx); break;
      case 'elite': this._elite(dt, ctx); break;
      case 'meteor': this._meteor(dt, ctx); break;
      default: this._scout(dt, ctx);
    }

    // fuera de pantalla por abajo/lados -> eliminar
    if (this.y < -ctx.halfH - 140 || this.x < -ctx.halfW - 260 || this.x > ctx.halfW + 260) {
      this.alive = false;
    }
    if (this.y > ctx.halfH + 260 && this.phase !== 'enter') {
      // no debería ocurrir, salvaguardia
      this.alive = false;
    }
  }

  _aimAt(ctx, speed, opts = {}) {
    const dx = ctx.playerX - this.x;
    const dy = ctx.playerY - this.y;
    const a = Math.atan2(dy, dx) + (opts.spread || 0);
    ctx.spawnEnemyBullet(this.x, this.y - this._h * 0.3, Math.cos(a) * speed, Math.sin(a) * speed, opts);
  }

  _scout(dt, ctx) {
    if (this.phase === 'enter') {
      this.y -= this.speed * dt;
      this.x += Math.sin(this.t * 2.2 + this.swayPhase) * 130 * dt;
      if (this.t > this.diveTimer) {
        this.phase = 'dive';
        const dx = ctx.playerX - this.x;
        const dy = Math.min(-160, ctx.playerY - this.y);
        const a = Math.atan2(dy, dx);
        this.vx = Math.cos(a) * this.speed * 1.7;
        this.vy = Math.sin(a) * this.speed * 1.7;
        ctx.audio.playSfx('zap', { rate: 1.4, gain: 0.35 });
      }
    } else {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      // tiro ocasional al mergullar
      if (this.fireTimer <= 0 && this.y > -ctx.halfH + 80) {
        this.fireTimer = 2.6;
        this._aimAt(ctx, this.bulletSpeed, { dmg: 8, scale: 1.2 });
        ctx.audio.playSfx('laser_enemy', { rate: 1.2, gain: 0.3 });
      }
    }
    this.fireTimer -= dt;
    this.setPosition(this.x, this.y);
  }

  _moveToHold(dt, targetY) {
    const diff = targetY - this.y;
    const step = this.speed * dt;
    if (Math.abs(diff) <= step) this.y = targetY;
    else this.y += Math.sign(diff) * step;
  }

  _interceptor(dt, ctx) {
    if (this.holdY !== null && this.phase === 'enter') {
      if (this.side) {
        // entrada lateral: primero alcanza targetX
        const dx = this.baseX - this.x;
        const step = this.speed * 2.4 * dt;
        if (Math.abs(dx) <= step) { this.x = this.baseX; this.phase = 'hover'; }
        else this.x += Math.sign(dx) * step;
        this.y -= 40 * dt;
      } else {
        this._moveToHold(dt, this.holdY);
        if (this.y <= this.holdY + 2) this.phase = 'hover';
      }
    } else if (this.phase === 'enter') {
      this.y -= this.speed * dt;
      if (this.y < (this.holdY ?? -ctx.halfH + 200)) this.phase = 'hover';
    }

    if (this.phase === 'hover') {
      const sway = Math.sin(this.t * 1.15 + this.swayPhase) * 210;
      const targetX = this.baseX + sway;
      this.x += (targetX - this.x) * Math.min(1, dt * 3.2);
      this.y += Math.sin(this.t * 1.7) * 26 * dt;

      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this.fireTimer = this.fireCooldown;
        this._aimAt(ctx, this.bulletSpeed, { dmg: 11 });
        ctx.audio.playSfx('laser_enemy', { rate: rand(0.95, 1.15), gain: 0.4 });
      }
    } else if (this.side) {
      this.fireTimer -= dt;
    }
    this.setPosition(this.x, this.y);
  }

  _heavy(dt, ctx) {
    if (this.phase === 'enter') {
      this._moveToHold(dt, this.holdY ?? 320);
      if (this.y <= (this.holdY ?? 320) + 2) this.phase = 'hover';
      this.x += Math.sin(this.t * 0.8) * 40 * dt;
    } else {
      this.x = this.baseX + Math.sin(this.t * 0.55 + this.swayPhase) * 130;
      this.y = (this.holdY ?? 320) + Math.sin(this.t * 0.9) * 24;

      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this.fireTimer = this.fireCooldown;
        // ráfaga de 3 en abanico apuntando al jugador
        const dx = ctx.playerX - this.x;
        const dy = ctx.playerY - this.y;
        const base = Math.atan2(dy, dx);
        for (const off of [-0.22, 0, 0.22]) {
          const a = base + off;
          ctx.spawnEnemyBullet(
            this.x, this.y - this._h * 0.35,
            Math.cos(a) * this.bulletSpeed,
            Math.sin(a) * this.bulletSpeed,
            { dmg: 13, type: 'big' }
          );
        }
        ctx.audio.playSfx('laser_beam', { rate: rand(0.6, 0.75), gain: 0.45 });
      }
    }
    this.setPosition(this.x, this.y);
  }

  _kamikaze(dt, ctx) {
    // parpadeo de alerta mientras persigue
    if (this.phase === 'chase') {
      const k = (Math.sin(this.t * 22) + 1) / 2;
      this._tintA.setHex(this.baseTint);
      this._tintB.setHex(0xffffff);
      this.sprite.material.color.copy(this._tintA).lerp(this._tintB, k * 0.7);
    }
    if (this.phase === 'enter') {
      this.y -= this.speed * dt;
      this.x += Math.sin(this.t * 3 + this.swayPhase) * 90 * dt;
      if (this.y < (this.holdY ?? ctx.halfH * 0.1)) {
        this.phase = 'chase';
        this._lockT = 0;
      }
    } else {
      // acelerar hacia el jugador
      const dx = ctx.playerX - this.x;
      const dy = ctx.playerY - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const targetSpeed = this.speed * 2.9;
      this.vx += ((dx / dist) * targetSpeed - this.vx) * Math.min(1, dt * 2.4);
      this.vy += ((dy / dist) * targetSpeed - this.vy) * Math.min(1, dt * 2.4);
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // chisporroteo de motor
      if (Math.random() < 0.6) {
        ctx.particles.spawn(this.x, this.y + this._h * 0.4, {
          count: 1, speed: 90, speedVar: 50, life: 0.3, lifeVar: 0.1,
          size: 13, sizeVar: 5, colorVar: [0xff9d3f, 0xff4b3e],
          angle: Math.PI / 2, spread: 0.6, drag: 3,
        });
      }

      if (dist < 74) {
        this.hp = 0; // kamikaze: explota
        this.alive = false;
        this._kamikazeHit = true;
      }
    }
    this.setPosition(this.x, this.y);
  }

  _elite(dt, ctx) {
    if (this.phase === 'enter') {
      this._moveToHold(dt, this.holdY ?? 360);
      if (this.y <= (this.holdY ?? 360) + 2) this.phase = 'hover';
    } else {
      // evasivo: se aleja horizontalmente del jugador y oscila
      const dx = ctx.playerX - this.x;
      const evade = Math.abs(dx) < 300 ? -Math.sign(dx) * 260 : 0;
      const targetX = this.baseX + Math.sin(this.t * 1.4 + this.swayPhase) * 250 + evade;
      this.x += (targetX - this.x) * Math.min(1, dt * 2.6);
      this.y = (this.holdY ?? 360) + Math.sin(this.t * 1.1) * 55;

      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this.fireTimer = this.fireCooldown;
        const dx2 = ctx.playerX - this.x;
        const dy2 = ctx.playerY - this.y;
        const base = Math.atan2(dy2, dx2);
        // abanico de 5
        for (let i = -2; i <= 2; i++) {
          const a = base + i * 0.15;
          ctx.spawnEnemyBullet(
            this.x, this.y - this._h * 0.3,
            Math.cos(a) * this.bulletSpeed,
            Math.sin(a) * this.bulletSpeed,
            { dmg: 10, alt: i % 2 === 0 }
          );
        }
        ctx.audio.playSfx('laser_enemy', { rate: 0.85, gain: 0.5 });
      }
    }
    this.setPosition(this.x, this.y);
  }

  _meteor(dt, ctx) {
    this.sprite.material.rotation += this.rotation * 6 * dt;
    this.flash.material.rotation = this.sprite.material.rotation;
    this.y -= this.speed * dt;
    this.x += Math.sin(this.t * 0.7 + this.swayPhase) * 70 * dt;
    this.setPosition(this.x, this.y);
  }

  onKamikazeHit() {
    const v = this._kamikazeHit;
    this._kamikazeHit = false;
    return v;
  }

  setVisible(v) {
    this.alive = v;
    this.sprite.visible = v;
    this.flash.visible = v;
    if (!v) this.flash.material.opacity = 0;
  }
}
