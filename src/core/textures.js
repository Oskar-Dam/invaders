/* ============================================================
   Texturas procedurales compartidas (anillos, ondas)
   ============================================================ */

import * as THREE from 'three';

let ringTex = null;

/** Anillo brillante generado por código (para escudos y ondas expansivas) */
export function createRingTexture() {
  if (ringTex) return ringTex;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.5);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.25)');
  g.addColorStop(0.82, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ringTex = new THREE.CanvasTexture(c);
  ringTex.colorSpace = THREE.SRGBColorSpace;
  return ringTex;
}

let glowTex = null;

/** Punto de luz suave (motores, núcleos) */
export function createGlowTexture() {
  if (glowTex) return glowTex;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}
