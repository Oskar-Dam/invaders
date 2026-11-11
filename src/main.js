/* ============================================================
   NEBULA STRIKE — LAST DEFENDER · punto de entrada
   ============================================================ */

import { Game } from './core/Game.js';

const canvas = document.getElementById('game-canvas');

try {
  const game = new Game(canvas);
  // expuesto para depuración y pruebas automatizadas
  window.__nebula = game;
  game.boot().catch((err) => {
    console.error('Error al iniciar NEBULA STRIKE:', err);
    const text = document.getElementById('load-text');
    if (text) text.textContent = 'ERROR LOADING ASSETS — see console';
  });
} catch (err) {
  console.error(err);
  const text = document.getElementById('load-text');
  if (text) text.textContent = 'WEBGL NOT AVAILABLE';
}
