/* ============================================================
   Renderer — WebGL + cámara ortográfica (2D) + screen shake
   ============================================================ */

import * as THREE from 'three';
import { HALF_H } from './config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x05060f, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-960, 960, HALF_H, -HALF_H, 1, 1500);
    this.camera.position.set(0, 0, 500);

    this.halfW = 960;
    this.halfH = HALF_H;

    // screen shake
    this.shakeAmount = 0;
    this.shakeTime = 0;
    this._shakeX = 0;
    this._shakeY = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 150));
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);

    // Altura del mundo fija (1080), el ancho varía con el aspecto
    this.halfH = HALF_H;
    this.halfW = HALF_H * (w / h);

    this.camera.left = -this.halfW;
    this.camera.right = this.halfW;
    this.camera.top = this.halfH;
    this.camera.bottom = -this.halfH;
    this.camera.updateProjectionMatrix();
  }

  addShake(amount, time = 0.25) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
    this.shakeTime = Math.max(this.shakeTime, time);
  }

  updateShake(dt) {
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const t = this.shakeTime;
      const a = this.shakeAmount * Math.max(0, t / 0.35);
      this._shakeX = (Math.random() * 2 - 1) * a;
      this._shakeY = (Math.random() * 2 - 1) * a;
      if (this.shakeTime <= 0) {
        this.shakeAmount = 0;
        this._shakeX = 0;
        this._shakeY = 0;
      }
    }
    this.camera.position.x = this._shakeX;
    this.camera.position.y = this._shakeY;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
