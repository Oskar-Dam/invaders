/* ============================================================
   Player — nave principal: movimiento con inercia, armas,
   escudo, invulnerabilidad, especial (rayo de energía)
   ============================================================ */

import * as THREE from 'three';
import { PLAYER, WEAPONS } from '../core/config.js';
import { createRingTexture, createGlowTexture } from '../core/textures.js';

const SCALE = 1.45;

export class Player {
  constructor(scene, assets, particles) {
    this.assets = assets;
    this.particles = particles;

    // sprite base con estados de daño
    this.textures = {
      normal: assets.tex('player'),
      d1: assets.tex('playerDamage1'),
      d2: assets.tex('playerDamage2'),
      d3: assets.tex('playerDamage3'),
    };

    this.sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.textures.normal,
        transparent: true,
        depthWrite: false,
        color: 0xe8ffff,
      })
    );
    this.sprite.scale.set(99 * SCALE, 75 * SCALE, 1);
    this.sprite.position.z = 5;
    scene.add(this.sprite);

    // fragmentos de daño: decals que se superponen a la nave (NO la sustituyen)
    this.damageOverlay = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.textures.d1,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      })
    );
    this.damageOverlay.scale.set(99 * SCALE, 75 * SCALE, 1);
    this.damageOverlay.position.z = 5.5;
    this.damageOverlay.visible = false;
    scene.add(this.damageOverlay);

    // estela del motor (glow radial cian)
    this.thrusterMat = new THREE.SpriteMaterial({
      map: createGlowTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0x8ff6ff,
      opacity: 0.85,
    });
    this.thruster = new THREE.Sprite(this.thrusterMat);
    this.thruster.scale.set(46, 46, 1);
    this.thruster.position.z = 4;
    scene.add(this.thruster);

    // escudo (anillo generado por código: nítido y coloreable)
    this.shieldMat = new THREE.SpriteMaterial({
      map: createRingTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0x66e6ff,
      opacity: 0,
    });
    this.shieldSprite = new THREE.Sprite(this.shieldMat);
    this.shieldSprite.scale.set(185, 185, 1);
    this.shieldSprite.position.z = 6;
    scene.add(this.shieldSprite);

    this.group = [this.sprite, this.damageOverlay, this.thruster, this.shieldSprite];
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = -380;
    this.vx = 0;
    this.vy = 0;
    this.health = PLAYER.maxHealth;
    this.shield = PLAYER.maxShield;
    this.invuln = 0;
    this.hitFlash = 0;
    this.fireTimer = 0;
    this.weaponIndex = 0;
    this.weaponLevels = [1, 1, 1];
    this.speedBoost = 0;
    this.specialCharges = PLAYER.specialMax;
    this.specialRegen = 0;
    this.alive = true;
    this._blink = 0;
    this._t = 0;
    this.sprite.visible = true;
    this.thruster.visible = true;
    this.shieldSprite.visible = true;
    this.sprite.material.map = this.textures.normal;
    this.sprite.material.color.setHex(0xffffff);
    this.damageOverlay.visible = false;
    this.damageOverlay.material.opacity = 0;
    this.shieldMat.opacity = 0;
    this.setPosition(this.x, this.y);
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.sprite.position.set(x, y, 5);
    this.damageOverlay.position.set(x, y, 5.5);
    this.thruster.position.set(x, y - 62, 4);
    this.shieldSprite.position.set(x, y, 6);
  }

  get weapon() { return WEAPONS[this.weaponIndex]; }
  get weaponLevel() { return this.weaponLevels[this.weaponIndex]; }

  selectWeapon(index) {
    if (index < 1 || index > 3) return;
    if (this.weaponIndex === index - 1) return;
    this.weaponIndex = index - 1;
    this.fireTimer = 0.12;
  }

  cycleWeaponUp() {
    const lvl = this.weaponLevels[this.weaponIndex];
    if (lvl < 3) {
      this.weaponLevels[this.weaponIndex] = lvl + 1;
      return true;
    }
    // si ya está al máximo, sube la siguiente arma disponible
    for (let i = 1; i <= WEAPONS.length; i++) {
      const idx = (this.weaponIndex + i) % WEAPONS.length;
      if (this.weaponLevels[idx] < 3) {
        this.weaponLevels[idx] = Math.min(3, this.weaponLevels[idx] + 1);
        this.weaponIndex = idx;
        return true;
      }
    }
    return false;
  }

  addSpecialCharge(n = 1) {
    this.specialCharges = Math.min(PLAYER.specialMax, this.specialCharges + n);
  }

  takeDamage(amount) {
    if (this.invuln > 0 || !this.alive) return false;
    let rest = amount;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, rest);
      this.shield -= absorbed;
      rest -= absorbed;
    }
    if (rest > 0) this.health -= rest;
    this.invuln = PLAYER.invulnTime;
    this.hitFlash = 0.25;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }
    return true;
  }

  update(dt, input, ctx) {
    if (!this.alive) return;
    this._t += dt;

    // ---- movimiento con inercia ----
    const mv = input.getMove();
    const speed = PLAYER.speed * (this.speedBoost > 0 ? 1.45 : 1);
    const targetVx = mv.x * speed;
    const targetVy = mv.y * speed;

    const accel = PLAYER.accel * dt;
    const dvx = targetVx - this.vx;
    const dvy = targetVy - this.vy;
    const len = Math.hypot(dvx, dvy);
    if (len > 0.001) {
      const step = Math.min(len, accel);
      this.vx += (dvx / len) * step;
      this.vy += (dvy / len) * step;
    }
    // fricción cuando no hay input
    if (Math.abs(mv.x) < 0.01 && Math.abs(mv.y) < 0.01) {
      const f = Math.max(0, 1 - PLAYER.friction * dt / PLAYER.speed);
      this.vx *= f;
      this.vy *= f;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // ---- límites de pantalla ----
    const marginX = 58;
    const marginY = 46;
    const limX = ctx.halfW - marginX;
    const limY = ctx.halfH - marginY;
    if (this.x < -limX) { this.x = -limX; this.vx = Math.max(0, this.vx); }
    if (this.x > limX) { this.x = limX; this.vx = Math.min(0, this.vx); }
    if (this.y < -limY) { this.y = -limY; this.vx *= 0.5; this.vy = Math.max(0, this.vy); }
    if (this.y > limY) { this.y = limY; this.vy = Math.min(0, this.vy); }

    this.setPosition(this.x, this.y);

    // ---- timers ----
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.speedBoost > 0) this.speedBoost -= dt;
    this.fireTimer -= dt;

    // regeneración de especial
    if (this.specialCharges < PLAYER.specialMax) {
      this.specialRegen += dt;
      if (this.specialRegen >= PLAYER.specialRegen) {
        this.specialRegen = 0;
        this.specialCharges++;
      }
    } else {
      this.specialRegen = 0;
    }

    // ---- disparo ----
    const firing = input.isFiring(ctx.autofire);
    if (firing && this.fireTimer <= 0) {
      this._fire(ctx);
      this.fireTimer = this.weapon.cooldown * (this.speedBoost > 0 ? 0.85 : 1);
    }

    // ---- visual: parpadeo de invulnerabilidad ----
    if (this.invuln > 0) {
      this._blink += dt * 18;
      this.sprite.visible = Math.floor(this._blink) % 2 === 0;
    } else {
      this.sprite.visible = true;
    }

    // ---- flash de daño ----
    if (this.hitFlash > 0) {
      this.sprite.material.color.setHex(0xff6a5a);
    } else {
      this.sprite.material.color.setHex(0xe8ffff);
    }

    // ---- decals de daño progresivos (superpuestos a la nave) ----
    const hpFrac = this.health / PLAYER.maxHealth;
    let dmgTex = null;
    if (hpFrac <= 0.3) dmgTex = this.textures.d3;
    else if (hpFrac <= 0.6) dmgTex = this.textures.d2;
    else if (hpFrac <= 0.85) dmgTex = this.textures.d1;
    if (dmgTex && this.sprite.visible) {
      if (this.damageOverlay.material.map !== dmgTex) this.damageOverlay.material.map = dmgTex;
      this.damageOverlay.visible = true;
      this.damageOverlay.material.opacity = 1;
    } else {
      this.damageOverlay.visible = false;
      this.damageOverlay.material.opacity = 0;
    }

    // ---- escudo ----
    const shieldFrac = this.shield / PLAYER.maxShield;
    if (shieldFrac > 0) {
      this.shieldMat.opacity =
        (0.3 + 0.12 * Math.sin(this._t * 6)) * Math.min(1, shieldFrac * 1.6) +
        (this.hitFlash > 0 ? 0.45 : 0);
      const pulse = 178 + Math.sin(this._t * 4) * 8;
      this.shieldSprite.scale.set(pulse, pulse, 1);
      this.shieldSprite.visible = true;
    } else {
      this.shieldMat.opacity = 0;
      this.shieldSprite.visible = false;
    }

    // ---- motor: partículas ----
    if (ctx.particlesEnabled) {
      this.particles.thruster(this.x + (Math.random() - 0.5) * 18, this.y - 66);
    }
    const throb = 0.9 + Math.sin(this._t * 30) * 0.14;
    this.thruster.scale.set(46 * throb, 46 * throb, 1);
    this.thrusterMat.opacity = this.speedBoost > 0 ? 1 : 0.8;
  }

  _fire(ctx) {
    const w = this.weapon;
    const lvl = w.levels[this.weaponLevel - 1] || w.levels[0];
    for (const b of lvl) {
      ctx.projectiles.spawnPlayer(this.x + b.x, this.y + 52, b.angle, b.dmg, b.scale);
    }
    // destello en la punta
    ctx.particles.spawn(this.x, this.y + 56, {
      count: 3,
      speed: 160,
      speedVar: 80,
      life: 0.14,
      lifeVar: 0.05,
      size: 16,
      sizeVar: 6,
      colorVar: [0x9ff6ff, 0xffffff],
      angle: Math.PI / 2,
      spread: 0.7,
      drag: 5,
    });
    const [r0, r1] = w.pitch;
    ctx.audio.playSfx(w.sfx, { rate: r0 + Math.random() * (r1 - r0), gain: 0.5 });
  }

  dispose(scene) {
    for (const m of this.group) {
      scene.remove(m);
      m.material.dispose();
    }
  }
}
