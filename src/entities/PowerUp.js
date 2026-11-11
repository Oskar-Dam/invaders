/* ============================================================
   PowerUp — mejoras recogibles con imán y animación
   ============================================================ */

import * as THREE from 'three';
import { POWERUPS } from '../core/config.js';

const POOL = 24;
const TYPES = Object.keys(POWERUPS);

export function pickPowerUpType() {
  const total = TYPES.reduce((s, t) => s + POWERUPS[t].weight, 0);
  let r = Math.random() * total;
  for (const t of TYPES) {
    r -= POWERUPS[t].weight;
    if (r <= 0) return t;
  }
  return 'health';
}

export class PowerUpSystem {
  constructor(scene, assets) {
    this.assets = assets;
    this.group = new THREE.Group();
    this.group.position.z = 4;
    scene.add(this.group);
    this.items = [];

    const texByKey = {
      health: 'puHealth', shield: 'puShield', weapon: 'puWeapon',
      speed: 'puSpeed', bomb: 'puBomb', multi: 'puMulti',
    };

    for (let i = 0; i < POOL; i++) {
      const holder = new THREE.Group();
      const core = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: null, transparent: true, depthWrite: false })
      );
      core.scale.set(52, 52, 1);
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: assets.tex('spark'),
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          color: 0xffffff,
          opacity: 0.55,
        })
      );
      glow.scale.set(110, 110, 1);
      holder.add(glow);
      holder.add(core);
      holder.visible = false;
      this.group.add(holder);

      this.items.push({
        holder, core, glow,
        alive: false, type: null,
        x: 0, y: 0, vy: -110, t: 0, life: 12,
        texKey: texByKey,
      });
    }
  }

  spawn(x, y, type = null) {
    const it = this.items.find((i) => !i.alive);
    if (!it) return null;
    const t = type || pickPowerUpType();
    const cfg = POWERUPS[t];
    it.alive = true;
    it.type = t;
    it.x = x;
    it.y = y;
    it.vy = -110;
    it.t = Math.random() * 6;
    it.life = 13;
    it.core.material.map = this.assets.tex(it.texKey[t]);
    it.core.material.color.setHex(0xffffff);
    it.glow.material.color.setHex(cfg.color);
    it.holder.visible = true;
    it.holder.position.set(x, y, 0);
    return t;
  }

  update(dt, playerX, playerY, onCollect, halfH) {
    for (const it of this.items) {
      if (!it.alive) continue;
      it.t += dt;
      it.life -= dt;

      const dx = playerX - it.x;
      const dy = playerY - it.y;
      const dist = Math.hypot(dx, dy);

      // imán
      if (dist < 190 && dist > 1) {
        const pull = 640 * dt;
        it.x += (dx / dist) * pull;
        it.y += (dy / dist) * pull;
      } else {
        it.y += it.vy * dt;
        it.x += Math.sin(it.t * 2.4) * 45 * dt;
      }

      it.holder.position.set(it.x, it.y, 0);
      const pulse = 1 + Math.sin(it.t * 7) * 0.12;
      it.core.scale.set(52 * pulse, 52 * pulse, 1);
      it.glow.scale.set(105 * pulse, 105 * pulse, 1);
      it.glow.material.opacity = 0.4 + Math.sin(it.t * 7) * 0.18;
      it.core.material.rotation = Math.sin(it.t * 2) * 0.25;

      if (dist < 44) {
        it.alive = false;
        it.holder.visible = false;
        onCollect(it.type, it.x, it.y);
        continue;
      }

      if (it.life <= 0 || it.y < -halfH - 60) {
        it.alive = false;
        it.holder.visible = false;
      }
    }
  }

  clear() {
    for (const it of this.items) {
      it.alive = false;
      it.holder.visible = false;
    }
  }

  get aliveCount() {
    return this.items.reduce((s, i) => s + (i.alive ? 1 : 0), 0);
  }
}
