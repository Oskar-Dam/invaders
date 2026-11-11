/* ============================================================
   BackgroundSystem — parallax multicapa (estrellas, nebulosas,
   planetas, speed lines) con profundidad y deriva vertical
   ============================================================ */

import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);

export class BackgroundSystem {
  constructor(scene, assets) {
    this.assets = assets;
    this.group = new THREE.Group();
    this.group.position.z = -60;
    scene.add(this.group);

    this.layers = [];
    this.stars = [];
    this.nebulas = [];
    this.planets = [];
    this.lines = [];

    this.speedBoost = 0; // aumenta durante eventos
    this.planetTimer = rand(8, 16);

    this._buildColorLayer();
    this._buildStarLayers();
    this._buildNebulas();
    this._buildSpeedLines();
  }

  _plane(tex, w, h, z, opacity = 1, blending = THREE.NormalBlending) {
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity,
      depthWrite: false,
      blending,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.z = z;
    this.group.add(mesh);
    return mesh;
  }

  _buildColorLayer() {
    // sin capa de color: el clear color (#05060f) aporta el azul medianoche
    this.colorPlane = null;
  }

  _makeStar(tex, size, speed, opacity) {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity,
      depthWrite: false,
      color: 0xffffff,
    });
    const s = new THREE.Sprite(mat);
    s.scale.set(size, size, 1);
    s.userData.speed = speed;
    s.userData.size = size;
    return s;
  }

  _buildStarLayers() {
    const small = this.assets.tex('starSmall');
    const big = this.assets.tex('starBig');
    for (let i = 0; i < 90; i++) {
      const s = this._makeStar(small, rand(4, 9), rand(40, 80), rand(0.35, 0.8));
      s.position.set(rand(-1000, 1000), rand(-560, 560), 6);
      this.stars.push(s);
      this.group.add(s);
    }
    for (let i = 0; i < 34; i++) {
      const s = this._makeStar(big, rand(12, 26), rand(130, 220), rand(0.5, 1));
      s.position.set(rand(-1000, 1000), rand(-560, 560), 8);
      this.stars.push(s);
      this.group.add(s);
    }
  }

  _buildNebulas() {
    const tex = this.assets.tex('nebula');
    if (!tex) return;
    // tonos oscuros y sutiles: azul medianoche, violeta y magenta tenue
    const colors = [0x1b2f8f, 0x3c1a6b, 0x123f7f, 0x5c1a4f, 0x0f2f5f];
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: rand(0.1, 0.18),
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: colors[i % colors.length],
      });
      const s = new THREE.Sprite(mat);
      const w = rand(520, 900);
      s.scale.set(w, w * 0.7, 1);
      s.position.set(rand(-950, 950), rand(-540, 540), 4);
      s.userData.speed = rand(14, 30);
      this.nebulas.push(s);
      this.group.add(s);
    }
  }

  _buildSpeedLines() {
    const tex = this.assets.tex('speedline');
    if (!tex) return;
    for (let i = 0; i < 14; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: rand(0.1, 0.28),
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: 0x9fe9ff,
      });
      const s = new THREE.Sprite(mat);
      const h = rand(160, 420);
      s.scale.set(4, h, 1);
      s.position.set(rand(-1000, 1000), rand(-560, 560), 10);
      s.userData.speed = rand(900, 1500);
      mat.opacity = rand(0.06, 0.16);
      this.lines.push(s);
      this.group.add(s);
    }
  }

  _spawnPlanet(halfW) {
    const keys = ['planet0', 'planet1', 'planet2'];
    const tex = this.assets.tex(keys[(Math.random() * keys.length) | 0]);
    if (!tex) return;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: rand(0.5, 0.85),
      depthWrite: false,
    });
    const s = new THREE.Sprite(mat);
    const size = rand(240, 460);
    s.scale.set(size, size, 1);
    s.position.set(rand(-halfW, halfW), 700, 3);
    s.userData.speed = rand(50, 90);
    this.planets.push(s);
    this.group.add(s);
  }

  update(dt, halfW, halfH) {
    const boost = 1 + this.speedBoost;

    for (const s of this.stars) {
      s.position.y -= s.userData.speed * boost * dt;
      if (s.position.y < -halfH - 40) {
        s.position.y = halfH + 40;
        s.position.x = rand(-halfW, halfW);
      } else if (s.position.x < -halfW - 60 || s.position.x > halfW + 60) {
        s.position.x = rand(-halfW, halfW);
      }
    }

    for (const n of this.nebulas) {
      n.position.y -= n.userData.speed * boost * dt;
      if (n.position.y < -halfH - 500) {
        n.position.y = halfH + 500;
        n.position.x = rand(-halfW, halfW);
      }
    }

    for (const l of this.lines) {
      l.position.y -= l.userData.speed * boost * dt;
      if (l.position.y < -halfH - 300) {
        l.position.y = halfH + 300;
        l.position.x = rand(-halfW, halfW);
      }
    }

    for (let i = this.planets.length - 1; i >= 0; i--) {
      const p = this.planets[i];
      p.position.y -= p.userData.speed * dt;
      if (p.position.y < -halfH - 500) {
        this.group.remove(p);
        p.material.dispose();
        this.planets.splice(i, 1);
      }
    }

    this.planetTimer -= dt;
    if (this.planetTimer <= 0) {
      this.planetTimer = rand(18, 34);
      if (this.planets.length < 2) this._spawnPlanet(halfW);
    }

    // el fondo se mantiene centrado en la cámara (x = 0)
    this.speedBoost = Math.max(0, this.speedBoost - dt * 0.6);
  }

  setBoost(v) {
    this.speedBoost = v;
  }
}
