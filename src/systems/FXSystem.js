/* ============================================================
   FXSystem — explosiones animadas (sprite sheets), ondas
   expansivas, textos flotantes, hit-stop y utilidades de estilo
   ============================================================ */

import * as THREE from 'three';
import { createRingTexture } from '../core/textures.js';

const SHEET_GRID = 8; // 8x8 = 64 frames
const FRAME_DUR = 0.014; // s por frame (~0.9 s por explosión)

export class FXSystem {
  constructor(scene, assets) {
    this.assets = assets;
    this.group = new THREE.Group();
    this.group.position.z = 25;
    scene.add(this.group);

    this.explosions = [];
    this.rings = [];
    this.hitStop = 0;

    // --- explosiones (sheets) ---
    const sheetKeys = ['blastSmall', 'blastBig', 'blastFire'];
    for (let i = 0; i < 14; i++) {
      const key = sheetKeys[i % sheetKeys.length];
      const base = assets.tex(key);
      if (!base) continue;
      const tex = base.clone();
      tex.needsUpdate = true;
      tex.repeat.set(1 / SHEET_GRID, 1 / SHEET_GRID);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      mesh.visible = false;
      mesh.userData = { alive: false, t: 0, dur: 0, size: 100 };
      this.explosions.push(mesh);
      this.group.add(mesh);
    }

    // --- ondas expansivas ---
    const ringTex = createRingTexture();
    this._ringTex = ringTex;
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: ringTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
        color: 0xffffff,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      mesh.visible = false;
      mesh.userData = { alive: false, t: 0, dur: 0, from: 0, to: 100 };
      this.rings.push(mesh);
      this.group.add(mesh);
    }

    // --- textos flotantes (DOM) ---
    this.textLayer = document.createElement('div');
    this.textLayer.id = 'fx-text-layer';
    this.textLayer.style.cssText =
      'position:fixed;inset:0;z-index:22;pointer-events:none;overflow:hidden;';
    document.body.appendChild(this.textLayer);
    this.texts = [];
    for (let i = 0; i < 12; i++) {
      const el = document.createElement('div');
      el.style.cssText =
        'position:absolute;font-family:KenVector,sans-serif;letter-spacing:.08em;' +
        'opacity:0;transform:translate(-50%,-50%);text-shadow:0 0 10px currentColor;white-space:nowrap;';
      this.textLayer.appendChild(el);
      this.texts.push({ el, alive: false, t: 0, x: 0, y: 0 });
    }
  }

  /* ---------------- explosiones ---------------- */
  explosion(x, y, size = 120, variant = 0) {
    const mesh = this.explosions.find((m) => !m.userData.alive);
    if (!mesh) return;
    mesh.userData.alive = true;
    mesh.userData.t = 0;
    mesh.userData.dur = SHEET_GRID * SHEET_GRID * FRAME_DUR;
    mesh.userData.size = size;
    mesh.position.set(x, y, 0);
    mesh.scale.set(size, size, 1);
    mesh.visible = true;
    mesh.material.opacity = 1;
    // variante: recorrer el sheet desde un frame distinto
    mesh.userData.startFrame = variant * 8;
    this._setFrame(mesh, mesh.userData.startFrame);
  }

  _setFrame(mesh, frame) {
    const f = ((frame % 64) + 64) % 64;
    const col = f % SHEET_GRID;
    const row = Math.floor(f / SHEET_GRID);
    mesh.material.map.offset.set(col / SHEET_GRID, 1 - (row + 1) / SHEET_GRID);
  }

  ring(x, y, from = 30, to = 340, dur = 0.55, color = 0xffffff) {
    const mesh = this.rings.find((m) => !m.userData.alive);
    if (!mesh) return;
    mesh.userData.alive = true;
    mesh.userData.t = 0;
    mesh.userData.dur = dur;
    mesh.userData.from = from;
    mesh.userData.to = to;
    mesh.position.set(x, y, 1);
    mesh.visible = true;
    mesh.material.color.setHex(color);
    mesh.material.opacity = 0.9;
    mesh.scale.set(from, from, 1);
  }

  /* ---------------- textos flotantes ---------------- */
  floatText(x, y, text, color = '#ffd23f', size = 22) {
    const t = this.texts.find((s) => !s.alive);
    if (!t) return;
    t.alive = true;
    t.t = 0;
    t.x = x;
    t.y = y;
    t.el.textContent = text;
    t.el.style.color = color;
    t.el.style.fontSize = `${size}px`;
    t.el.style.opacity = '1';
  }

  /* ---------------- hit-stop ---------------- */
  stop(duration = 0.06) {
    this.hitStop = Math.max(this.hitStop, duration);
  }

  consumeHitStop(dt) {
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return true;
    }
    return false;
  }

  /* ---------------- update ---------------- */
  update(dt, halfW, halfH) {
    for (const m of this.explosions) {
      const u = m.userData;
      if (!u.alive) continue;
      u.t += dt;
      const frame = u.startFrame + Math.floor(u.t / FRAME_DUR);
      if (u.t >= u.dur) {
        u.alive = false;
        m.visible = false;
        continue;
      }
      this._setFrame(m, frame);
      const k = 1 - u.t / u.dur;
      m.material.opacity = Math.min(1, k * 1.6);
    }

    for (const m of this.rings) {
      const u = m.userData;
      if (!u.alive) continue;
      u.t += dt;
      if (u.t >= u.dur) {
        u.alive = false;
        m.visible = false;
        m.material.opacity = 0;
        continue;
      }
      const k = u.t / u.dur;
      const e = 1 - Math.pow(1 - k, 3); // ease-out
      const size = u.from + (u.to - u.from) * e;
      m.scale.set(size, size, 1);
      m.material.opacity = 0.9 * (1 - k);
    }

    // textos: requieren proyección mundo->pantalla
    for (const t of this.texts) {
      if (!t.alive) continue;
      t.t += dt;
      if (t.t > 0.9) {
        t.alive = false;
        t.el.style.opacity = '0';
        continue;
      }
      const px = (t.x / halfW * 0.5 + 0.5) * window.innerWidth;
      const py = (0.5 - t.y / (halfH * 2)) * window.innerHeight - t.t * 60;
      t.el.style.left = `${px}px`;
      t.el.style.top = `${py}px`;
      t.el.style.opacity = String(Math.max(0, 1 - t.t / 0.9));
      const sc = 1 + Math.min(0.4, t.t * 1.2);
      t.el.style.transform = `translate(-50%,-50%) scale(${sc})`;
    }
  }

  clear() {
    for (const m of this.explosions) { m.userData.alive = false; m.visible = false; }
    for (const m of this.rings) { m.userData.alive = false; m.visible = false; }
    for (const t of this.texts) { t.alive = false; t.el.style.opacity = '0'; }
    this.hitStop = 0;
  }
}
