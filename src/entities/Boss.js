/* ============================================================
   Boss — "COLOSSUS // STATION-9"
   Entrada animada, 3 fases, patrones de ataque, indicadores
   previos al barrido láser y secuencia de destrucción
   ============================================================ */

import * as THREE from 'three';
import { BOSS } from '../core/config.js';
import { createGlowTexture } from '../core/textures.js';

const rand = (a, b) => a + Math.random() * (b - a);

export class Boss {
  constructor(scene, assets) {
    this.scene = scene;
    this.assets = assets;

    this.group = new THREE.Group();
    this.group.position.z = 1;
    scene.add(this.group);

    // cuerpo
    this.body = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: assets.tex('boss'),
        transparent: true,
        depthWrite: false,
        color: BOSS.tint || 0xffffff,
      })
    );
    const bw = 128 * BOSS.scale;
    this.body.scale.set(bw, bw, 1);
    this.group.add(this.body);

    // alas / torretas laterales
    this.wingL = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: assets.tex('bossWing'),
        transparent: true,
        depthWrite: false,
        color: BOSS.wingTint || 0xffffff,
      })
    );
    this.wingR = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: assets.tex('bossWing'),
        transparent: true,
        depthWrite: false,
        color: BOSS.wingTint || 0xffffff,
      })
    );
    const ww = 128 * BOSS.wingScale;
    this.wingL.scale.set(ww, ww, 1);
    this.wingR.scale.set(ww, ww, 1);
    this.wingL.position.z = -1;
    this.wingR.position.z = -1;
    this.wingR.material.rotation = Math.PI;
    this.group.add(this.wingL);
    this.group.add(this.wingR);

    // resplandor de motores (glow radial, no llama rectangular)
    this.engineMat = new THREE.SpriteMaterial({
      map: createGlowTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xff5ac8,
      opacity: 0.9,
    });
    this.engineL = new THREE.Sprite(this.engineMat);
    this.engineR = new THREE.Sprite(this.engineMat.clone());
    this.engineL.scale.set(210, 210, 1);
    this.engineR.scale.set(210, 210, 1);
    this.engineL.position.z = -2;
    this.engineR.position.z = -2;
    this.group.add(this.engineL);
    this.group.add(this.engineR);

    // destello de daño
    this.flashMat = new THREE.SpriteMaterial({
      map: assets.tex('boss'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xffffff,
      opacity: 0,
    });
    this.flash = new THREE.Sprite(this.flashMat);
    this.flash.scale.set(bw, bw, 1);
    this.flash.position.z = 1;
    this.group.add(this.flash);

    // telegraph / barrido láser
    this.beamMat = new THREE.MeshBasicMaterial({
      color: 0xff3ea5,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.beamMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.beamMat);
    this.beamMesh.position.z = 12;
    this.beamMesh.visible = false;
    scene.add(this.beamMesh);

    this.beam = { active: false, telegraph: false, x: 0, prevX: 0, halfWidth: 46 };

    this.radius = BOSS.radius;
    this.active = false;
    this.group.visible = false;
  }

  reset(halfH) {
    this.health = BOSS.maxHealth;
    this.maxHealth = BOSS.maxHealth;
    this.phase = 1;
    this.state = 'enter';
    this.t = 0;
    this.halfH = halfH;
    this.x = 0;
    this.y = halfH + 420;
    this.enterTarget = BOSS.enterY;
    this.attackName = null;
    this.attackTimer = 0;
    this.attackDuration = 0;
    this.fireTimer = 0;
    this.spiralAngle = 0;
    this.beamTimer = 0;
    this.beamState = 'idle'; // idle | telegraph | sweep
    this.beamX = 0;
    this.beamDir = 1;
    this.hitFlash = 0;
    this.dyingTimer = 0;
    this.explodeTimer = 0;
    this.contactCooldown = 0;
    this.smokeTimer = 0;
    this.active = true;
    this.group.visible = true;
    this.beamMesh.visible = false;
    this.beam.active = false;
    this.beam.telegraph = false;
    this.setPosition(this.x, this.y);
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.group.position.set(x, y, 1);
    const bob = Math.sin(this.t * 2) * 8;
    const pulse = 1 + Math.sin(this.t * 9) * 0.12;
    this.engineL.position.set(-165, -305 + bob, -2);
    this.engineR.position.set(165, -305 + bob, -2);
    this.engineL.scale.set(170 * pulse, 170 * pulse, 1);
    this.engineR.scale.set(170 * pulse, 170 * pulse, 1);
    this.wingL.position.set(-235, 10, -1);
    this.wingR.position.set(235, 10, -1);
  }

  get hpFraction() {
    return Math.max(0, this.health / this.maxHealth);
  }

  damage(amount) {
    if (!this.active || this.state === 'dying' || this.state === 'enter') return false;
    this.health -= amount;
    this.hitFlash = 0.1;
    const frac = this.hpFraction;
    const newPhase = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
    if (newPhase !== this.phase) {
      this.phase = newPhase;
      this.attackName = null; // fuerza nuevo patrón
      this.attackTimer = 0;
      this.beamState = 'idle';
      this.beamMesh.visible = false;
      this.beam.active = false;
      this.beam.telegraph = false;
      return 'phase';
    }
    if (this.health <= 0) {
      this.health = 0;
      this.state = 'dying';
      this.dyingTimer = 2.8;
      this.explodeTimer = 0;
      this.beamState = 'idle';
      this.beamMesh.visible = false;
      this.beam.active = false;
      this.beam.telegraph = false;
      return 'dying';
    }
    return true;
  }

  /* ---------- selección de ataques ---------- */
  _pickAttack() {
    const byPhase = {
      1: ['aimed_burst', 'fan'],
      2: ['spiral', 'aimed_burst', 'fan'],
      3: ['beam_sweep', 'missiles', 'spiral_fast', 'aimed_burst'],
    };
    const list = byPhase[this.phase];
    let name = list[(Math.random() * list.length) | 0];
    if (name === this._lastAttack && list.length > 1) {
      name = list[(list.indexOf(name) + 1) % list.length];
    }
    this._lastAttack = name;
    return name;
  }

  _startAttack(name) {
    this.attackName = name;
    this.attackTimer = 0;
    this.fireTimer = 0;
    this.spiralAngle = Math.random() * Math.PI;
    const durations = {
      aimed_burst: 2.2,
      fan: 2.4,
      spiral: 2.8,
      spiral_fast: 3.0,
      missiles: 2.4,
      beam_sweep: 3.6,
    };
    this.attackDuration = durations[name] || 2.4;

    if (name === 'beam_sweep') {
      this.beamState = 'telegraph';
      this.beamTimer = 1.0;
      this.beamDir = Math.random() < 0.5 ? -1 : 1;
      this.beamX = this.beamDir > 0 ? -this.halfW() + 60 : this.halfW() - 60;
      this.beamMesh.visible = true;
      this.beam.telegraph = true;
      this.beam.active = false;
      this.beam.prevX = this.beamX; // para colisión barrida (swept)
    }
  }

  halfW() { return this._halfW || 960; }

  /* ---------- actualización ---------- */
  update(dt, ctx) {
    if (!this.active) return;
    this.t += dt;
    this._halfW = ctx.halfW;

    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      this.flashMat.opacity = Math.max(0, this.hitFlash / 0.1) * 0.85;
    } else {
      this.flashMat.opacity = 0;
    }

    if (this.state === 'enter') {
      const diff = this.enterTarget - this.y;
      const step = 260 * dt;
      if (Math.abs(diff) <= step) {
        this.y = this.enterTarget;
        this.state = 'fight';
        this.attackName = null;
      } else {
        this.y += Math.sign(diff) * step;
      }
      this.x = Math.sin(this.t * 0.6) * 60;
      this.setPosition(this.x, this.y);
      return;
    }

    if (this.state === 'dying') {
      this.dyingTimer -= dt;
      this.explodeTimer -= dt;
      this.x += Math.sin(this.t * 18) * 6;
      this.y += Math.sin(this.t * 13) * 3;
      this.setPosition(this.x, this.y);
      if (this.explodeTimer <= 0) {
        this.explodeTimer = 0.14;
        const ox = rand(-280, 280);
        const oy = rand(-230, 230);
        ctx.onBossExplosion(this.x + ox, this.y + oy);
      }
      if (this.dyingTimer <= 0) {
        this.active = false;
        this.group.visible = false;
        ctx.onBossDeath();
      }
      return;
    }

    // ---- combate ----
    this.attackTimer += dt;
    if (!this.attackName || this.attackTimer >= this.attackDuration) {
      this._startAttack(this._pickAttack());
    }

    // balanceo horizontal
    const sway = Math.sin(this.t * BOSS.swaySpeed) * BOSS.swayAmount;
    this.x = sway * (this.phase === 3 ? 1.15 : 1);
    this.y = BOSS.enterY + Math.sin(this.t * 0.9) * 26;
    this.setPosition(this.x, this.y);

    // humo cuando está dañado
    if (this.hpFraction < 0.5 && ctx.particlesEnabled) {
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = 0.08;
        ctx.particles.spawn(this.x + rand(-240, 240), this.y + rand(-180, 180), {
          count: 1,
          speed: 40, speedVar: 30,
          life: 1.1, lifeVar: 0.4,
          size: 34, sizeVar: 14,
          colorVar: [0x555566, 0x883322, 0x333344],
          drag: 1.2,
        });
      }
    }

    this._runAttack(dt, ctx);

    // contacto con el jugador
    this.contactCooldown -= dt;
  }

  _runAttack(dt, ctx) {
    this.fireTimer -= dt;
    const spawn = ctx.spawnEnemyBullet;

    switch (this.attackName) {
      case 'aimed_burst': {
        if (this.fireTimer <= 0) {
          this.fireTimer = 0.55;
          const dx = ctx.playerX - this.x;
          const dy = ctx.playerY - (this.y - 120);
          const base = Math.atan2(dy, dx);
          for (const off of [-0.14, 0, 0.14]) {
            const a = base + off;
            spawn(this.x + Math.cos(off) * 60, this.y - 150,
              Math.cos(a) * 520, Math.sin(a) * 520,
              { dmg: 12, type: 'big', scale: 1.1 });
          }
          ctx.audio.playSfx('laser_beam', { rate: 0.7, gain: 0.5 });
        }
        break;
      }
      case 'fan': {
        if (this.fireTimer <= 0) {
          this.fireTimer = 0.95;
          for (let i = -4; i <= 4; i++) {
            const a = -Math.PI / 2 + i * 0.17;
            spawn(this.x, this.y - 140, Math.cos(a) * 470, Math.sin(a) * 470,
              { dmg: 10, alt: i % 2 === 0 });
          }
          ctx.audio.playSfx('laser_enemy', { rate: 0.75, gain: 0.55 });
        }
        break;
      }
      case 'spiral':
      case 'spiral_fast': {
        const rate = this.attackName === 'spiral_fast' ? 0.075 : 0.11;
        const inc = this.attackName === 'spiral_fast' ? 0.5 : 0.38;
        if (this.fireTimer <= 0) {
          this.fireTimer = rate;
          this.spiralAngle += inc;
          for (const base of [0, Math.PI]) {
            const a = this.spiralAngle + base;
            spawn(this.x, this.y - 60,
              Math.cos(a) * 430, Math.sin(a) * 430,
              { dmg: 9 });
          }
          if (Math.random() < 0.5) {
            ctx.audio.playSfx('laser_enemy', { rate: rand(0.7, 0.9), gain: 0.28 });
          }
        }
        break;
      }
      case 'missiles': {
        if (this.fireTimer <= 0) {
          this.fireTimer = 0.7;
          for (const off of [-160, -60, 60, 160]) {
            const a = -Math.PI / 2 + off / 400;
            spawn(this.x + off, this.y - 130,
              Math.cos(a) * 330, Math.sin(a) * 330,
              { dmg: 15, homing: 1.5, type: 'big', scale: 0.9 });
          }
          ctx.audio.playSfx('boss_warning', { rate: 1.1, gain: 0.5 });
        }
        break;
      }
      case 'beam_sweep': {
        this.beamTimer -= dt;
        if (this.beamState === 'telegraph') {
          // línea de aviso parpadeante
          const blink = Math.sin(this.t * 30) > 0 ? 0.4 : 0.12;
          this.beamMat.opacity = blink;
          this.beamMat.color.setHex(0xffd23f);
          this.beamMesh.position.set(this.beamX, 0, 12);
          this.beamMesh.scale.set(70, this.halfH * 2, 1);
          this.beam.telegraph = true;
          this.beam.active = false;
          this.beam.x = this.beamX;
          if (this.beamTimer <= 0) {
            this.beamState = 'sweep';
            this.beamTimer = 1.5;
            this.beamMat.color.setHex(0xff3ea5);
            ctx.audio.playSfx('laser_beam', { rate: 0.5, gain: 0.75 });
          }
        } else if (this.beamState === 'sweep') {
          const w = this.halfW();
          this.beam.prevX = this.beamX; // posición del frame anterior (colisión swept)
          this.beamX += this.beamDir * ((w * 2) / 1.5) * dt;
          if (this.beamDir > 0 && this.beamX > w - 40) { this.beamDir = -1; }
          if (this.beamDir < 0 && this.beamX < -w + 40) { this.beamDir = 1; }
          this.beamMat.opacity = 0.85;
          this.beamMesh.position.set(this.beamX, 0, 12);
          this.beamMesh.scale.set(92, this.halfH * 2, 1);
          this.beam.active = true;
          this.beam.telegraph = false;
          this.beam.x = this.beamX;
          if (this.beamTimer <= 0) {
            this.beamState = 'idle';
            this.beamMesh.visible = false;
            this.beam.active = false;
            this.beam.telegraph = false;
            this.attackTimer = this.attackDuration; // termina ataque
          }
        }
        break;
      }
      default:
        break;
    }
  }

  onKamikazeHit() { return false; }

  dispose(scene) {
    scene.remove(this.group);
    scene.remove(this.beamMesh);
  }
}
