/* ============================================================
   ParticleSystem — pooling de partículas (chispas, humo,
   estelas de motor, destellos de impacto)
   ============================================================ */

import * as THREE from 'three';

const MAX = 420;

export class ParticleSystem {
  constructor(scene, assets) {
    this.assets = assets;
    this.pool = [];
    this.index = 0;
    this.group = new THREE.Group();
    this.group.position.z = 30;
    scene.add(this.group);

    const spark = assets.tex('spark');
    for (let i = 0; i < MAX; i++) {
      const mat = new THREE.SpriteMaterial({
        map: spark,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: 0xffffff,
      });
      const s = new THREE.Sprite(mat);
      s.visible = false;
      s.userData = { alive: false };
      this.pool.push(s);
      this.group.add(s);
    }
  }

  spawn(x, y, opts = {}) {
    const {
      count = 8,
      speed = 220,
      speedVar = 120,
      life = 0.5,
      lifeVar = 0.25,
      size = 12,
      sizeVar = 6,
      color = 0xffffff,
      colorVar = null,
      gravity = 0,
      drag = 1.6,
      angle = null,
      spread = Math.PI * 2,
      z = 0,
    } = opts;

    for (let i = 0; i < count; i++) {
      const s = this.pool[this.index];
      this.index = (this.index + 1) % MAX;

      const a = angle === null ? Math.random() * Math.PI * 2 : angle + (Math.random() - 0.5) * spread;
      const sp = speed + (Math.random() * 2 - 1) * speedVar;
      s.position.set(x, y, z);
      s.userData.alive = true;
      s.userData.vx = Math.cos(a) * sp;
      s.userData.vy = Math.sin(a) * sp;
      s.userData.life = Math.max(0.08, life + (Math.random() * 2 - 1) * lifeVar);
      s.userData.maxLife = s.userData.life;
      s.userData.gravity = gravity;
      s.userData.drag = drag;
      const sz = Math.max(2, size + (Math.random() * 2 - 1) * sizeVar);
      s.scale.set(sz, sz, 1);
      s.material.color.setHex(
        colorVar ? colorVar[(Math.random() * colorVar.length) | 0] : color
      );
      s.material.opacity = 1;
      s.visible = true;
    }
  }

  /* estela del motor de la nave */
  thruster(x, y) {
    this.spawn(x, y, {
      count: 1,
      speed: 60,
      speedVar: 30,
      life: 0.32,
      lifeVar: 0.1,
      size: 15,
      sizeVar: 6,
      colorVar: [0x4ff0ff, 0x2f8bff, 0xffffff],
      angle: -Math.PI / 2,
      spread: 0.5,
      drag: 2.6,
    });
  }

  explosion(x, y, big = false) {
    this.spawn(x, y, {
      count: big ? 40 : 18,
      speed: big ? 480 : 300,
      speedVar: big ? 220 : 140,
      life: big ? 0.9 : 0.55,
      lifeVar: 0.3,
      size: big ? 30 : 18,
      sizeVar: big ? 16 : 9,
      colorVar: [0xffd23f, 0xff9d3f, 0xff4b3e, 0xffffff, 0xff3ea5],
      drag: 2.2,
    });
    if (big) {
      this.spawn(x, y, {
        count: 22,
        speed: 200,
        speedVar: 100,
        life: 1.1,
        lifeVar: 0.4,
        size: 44,
        sizeVar: 20,
        colorVar: [0x5a5a66, 0x8a8a99, 0x3c3c48],
        drag: 1.4,
      });
    }
  }

  sparks(x, y, color = 0x4ff0ff) {
    this.spawn(x, y, {
      count: 7,
      speed: 340,
      speedVar: 180,
      life: 0.3,
      lifeVar: 0.15,
      size: 11,
      sizeVar: 5,
      color,
      drag: 3.2,
    });
  }

  update(dt) {
    for (const s of this.pool) {
      const u = s.userData;
      if (!u.alive) continue;
      u.life -= dt;
      if (u.life <= 0) {
        u.alive = false;
        s.visible = false;
        continue;
      }
      s.position.x += u.vx * dt;
      s.position.y += u.vy * dt;
      u.vy += u.gravity * dt;
      const d = 1 - Math.min(1, u.drag * dt);
      u.vx *= d;
      u.vy *= d;
      const t = u.life / u.maxLife;
      s.material.opacity = t;
      const base = s.scale.x;
      s.scale.setScalar(Math.max(1, base * (1 - dt * 0.6)));
    }
  }

  clear() {
    for (const s of this.pool) {
      s.userData.alive = false;
      s.visible = false;
    }
  }
}
