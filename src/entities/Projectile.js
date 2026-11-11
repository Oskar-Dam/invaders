/* ============================================================
   Projectile — pools de proyectiles (jugador y enemigos)
   ============================================================ */

import * as THREE from 'three';

const PLAYER_POOL = 220;
const ENEMY_POOL = 460;
const BULLET_SPEED = 1500;
const ENEMY_BULLET_SPEED = 520;

class Pool {
  constructor(scene, texture, count, blending, tint) {
    this.items = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        blending,
        color: tint,
      });
      const s = new THREE.Sprite(mat);
      s.visible = false;
      s.userData = {
        alive: false,
        vx: 0,
        vy: 0,
        dmg: 0,
        radius: 8,
        life: 0,
        homing: 0,
        pierce: 0,
        owner: null,
      };
      this.items.push(s);
      this.group.add(s);
    }
    this.index = 0;
  }

  get() {
    for (let i = 0; i < this.items.length; i++) {
      const s = this.items[(this.index + i) % this.items.length];
      if (!s.userData.alive) {
        this.index = (this.index + i + 1) % this.items.length;
        return s;
      }
    }
    // fallback: recicla el más antiguo
    const s = this.items[this.index];
    this.index = (this.index + 1) % this.items.length;
    return s;
  }
}

export class ProjectileSystem {
  constructor(scene, assets) {
    this.scene = scene;

    this.playerPool = new Pool(
      scene,
      assets.tex('laserPlayer'),
      PLAYER_POOL,
      THREE.AdditiveBlending,
      0x9ff6ff
    );
    this.enemyPool = new Pool(
      scene,
      assets.tex('laserEnemy'),
      ENEMY_POOL,
      THREE.AdditiveBlending,
      0xff6a5a
    );
    this.enemyPoolAlt = new Pool(
      scene,
      assets.tex('laserEnemy2'),
      Math.floor(ENEMY_POOL / 2),
      THREE.AdditiveBlending,
      0xff8ce0
    );

    this._playerAlive = [];
    this._enemyAlive = [];
  }

  spawnPlayer(x, y, angleDeg, dmg, scale = 1.5) {
    const s = this.playerPool.get();
    const a = (angleDeg * Math.PI) / 180;
    s.position.set(x, y, 7);
    s.visible = true;
    s.material.rotation = a + Math.PI / 2;
    s.scale.set(13 * scale, 37 * scale, 1);
    s.userData.alive = true;
    s.userData.vx = Math.sin(a) * BULLET_SPEED;
    s.userData.vy = Math.cos(a) * BULLET_SPEED;
    s.userData.dmg = dmg;
    s.userData.radius = 7 * scale;
    s.userData.life = 3;
    s.userData.homing = 0;
    s.userData.pierce = 0;
    return s;
  }

  spawnEnemy(x, y, vx, vy, opts = {}) {
    const { dmg = 10, scale = 1.5, type = 'normal', homing = 0, alt = false } = opts;
    const pool = alt ? this.enemyPoolAlt : this.enemyPool;
    const s = pool.get();
    s.position.set(x, y, 6);
    s.visible = true;
    const ang = Math.atan2(vy, vx);
    s.material.rotation = ang - Math.PI / 2;
    const size = type === 'big' ? 2.3 : type === 'small' ? 1.1 : 1.5;
    s.scale.set(13 * size * (scale || 1), 37 * size * (scale || 1), 1);
    if (type === 'big') s.material.color.setHex(0xffd23f);
    else if (alt) s.material.color.setHex(0xff8ce0);
    else s.material.color.setHex(0xff6a5a);
    s.userData.alive = true;
    s.userData.vx = vx;
    s.userData.vy = vy;
    s.userData.dmg = dmg;
    s.userData.radius = (type === 'big' ? 16 : 9) * (scale || 1);
    s.userData.life = 7;
    s.userData.homing = homing;
    s.userData.pierce = 0;
    return s;
  }

  update(dt, halfW, halfH, playerPos) {
    const p = this._playerAlive;
    p.length = 0;
    for (const s of this.playerPool.items) {
      const u = s.userData;
      if (!u.alive) continue;
      u.life -= dt;
      s.position.x += u.vx * dt;
      s.position.y += u.vy * dt;
      if (u.life <= 0 || Math.abs(s.position.x) > halfW + 80 || Math.abs(s.position.y) > halfH + 120) {
        u.alive = false;
        s.visible = false;
      } else {
        p.push(s);
      }
    }

    const e = this._enemyAlive;
    e.length = 0;
    for (const pool of [this.enemyPool, this.enemyPoolAlt]) {
      for (const s of pool.items) {
        const u = s.userData;
        if (!u.alive) continue;
        u.life -= dt;

        if (u.homing > 0 && playerPos) {
          const desired = Math.atan2(playerPos.y - s.position.y, playerPos.x - s.position.x);
          const current = Math.atan2(u.vy, u.vx);
          let diff = desired - current;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const turn = Math.sign(diff) * Math.min(Math.abs(diff), u.homing * dt);
          const ang = current + turn;
          const speed = Math.hypot(u.vx, u.vy);
          u.vx = Math.cos(ang) * speed;
          u.vy = Math.sin(ang) * speed;
          s.material.rotation = ang - Math.PI / 2;
        }

        s.position.x += u.vx * dt;
        s.position.y += u.vy * dt;

        if (u.life <= 0 || Math.abs(s.position.x) > halfW + 140 || Math.abs(s.position.y) > halfH + 180) {
          u.alive = false;
          s.visible = false;
        } else {
          e.push(s);
        }
      }
    }
  }

  get playerBullets() { return this._playerAlive; }
  get enemyBullets() { return this._enemyAlive; }

  kill(s) {
    s.userData.alive = false;
    s.visible = false;
  }

  clearEnemyBullets() {
    for (const pool of [this.enemyPool, this.enemyPoolAlt]) {
      for (const s of pool.items) {
        s.userData.alive = false;
        s.visible = false;
      }
    }
    this._enemyAlive.length = 0;
  }

  clear() {
    this.clearEnemyBullets();
    for (const s of this.playerPool.items) {
      s.userData.alive = false;
      s.visible = false;
    }
    this._playerAlive.length = 0;
  }
}
