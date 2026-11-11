/* ============================================================
   Pruebas de lógica pura (sin navegador)
   Ejecutar: npm test
   ============================================================ */

import assert from 'node:assert/strict';
import { circleHit, pointInRect, rectCircleHit } from '../src/systems/CollisionSystem.js';
import { ScoreSystem } from '../src/systems/ScoreSystem.js';
import { WaveSystem, WAVES } from '../src/systems/WaveSystem.js';
import { pickPowerUpType, PowerUpSystem } from '../src/entities/PowerUp.js';
import { difficulty, WEAPONS, ENEMIES, POWERUPS, BOSS } from '../src/core/config.js';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error('   ', err.message);
    process.exitCode = 1;
  }
}

console.log('CollisionSystem');
test('círculos que se solapan colisionan', () => {
  assert.equal(circleHit(0, 0, 10, 15, 0, 10), true);
  assert.equal(circleHit(0, 0, 10, 30, 0, 10), false);
  assert.equal(circleHit(5, 5, 8, 5, 5, 8), true);
});
test('rectángulo contra círculo', () => {
  assert.equal(rectCircleHit(0, 0, 8, 10, 0, 8), true);
  assert.equal(rectCircleHit(0, 0, 8, 40, 0, 8), false);
});
test('pointInRect', () => {
  assert.equal(pointInRect(0, 0, 0, 0, 10, 10), true);
  assert.equal(pointInRect(11, 0, 0, 0, 10, 10), false);
});

console.log('ScoreSystem');
test('multiplicador por combos', () => {
  const s = new ScoreSystem();
  assert.equal(s.multiplier, 1);
  for (let i = 0; i < 4; i++) s.addKill(100);
  assert.equal(s.multiplier, 2);
  s.breakCombo();
  assert.equal(s.multiplier, 1);
});
test('el combo caduca con el tiempo', () => {
  const s = new ScoreSystem();
  s.addKill(100);
  s.update(5);
  assert.equal(s.combo, 0);
});
test('power-up x2 duplica la puntuación', () => {
  const s = new ScoreSystem();
  s.activateBoost(10);
  const before = s.score;
  s.addKill(100);
  assert.equal(s.score - before, 200);
  s.update(11);
  assert.equal(s.multiplierBoost, 1);
});
test('puntuación acumulativa', () => {
  const s = new ScoreSystem();
  s.addKill(100);
  s.addKill(100);
  assert.equal(s.score, 200);
  assert.equal(s.kills, 2);
});

console.log('WaveSystem');
test('las oleadas generan apariciones y progresan hasta el jefe', () => {
  const w = new WaveSystem();
  w.start();
  let spawned = 0;
  w.onSpawn = () => { spawned++; };

  const halfW = 960;
  let guard = 0;
  let reachedBoss = false;
  while (guard++ < 5000 && !reachedBoss) {
    const res = w.update(0.1, halfW, 0); // siempre 0 enemigos vivos → avanza rápido
    if (res.boss) reachedBoss = true;
  }
  assert.ok(reachedBoss, 'debe alcanzar al jefe');
  assert.ok(spawned > 20, `debería haber spawned >20 eventos, hubo ${spawned}`);
});
test('cada oleada tiene nombre y función build', () => {
  assert.ok(WAVES.length >= 6, 'al menos 6 oleadas');
  for (const wv of WAVES) {
    assert.equal(typeof wv.name, 'string');
    const events = wv.build(960);
    assert.ok(Array.isArray(events) && events.length > 0, `${wv.name} sin eventos`);
    for (const e of events) {
      assert.ok(ENEMIES[e.type], `${e.type} no existe en ENEMIES`);
      assert.equal(typeof e.x, 'number');
      assert.equal(typeof e.y, 'number');
    }
  }
});

console.log('Config');
test('dificultad progresiva', () => {
  const d1 = difficulty(1);
  const d5 = difficulty(5);
  assert.ok(d5.hpMul > d1.hpMul);
  assert.ok(d5.speedMul > d1.speedMul);
  assert.ok(d5.fireMul < d1.fireMul); // cadencia más rápida
});
test('3 armas con 3 niveles cada una', () => {
  assert.equal(WEAPONS.length, 3);
  for (const w of WEAPONS) {
    assert.equal(w.levels.length, 3);
    for (const lvl of w.levels) assert.ok(lvl.length > 0);
  }
});
test('5+ tipos de enemigos con comportamiento', () => {
  const required = ['scout', 'interceptor', 'heavy', 'kamikaze', 'elite'];
  for (const k of required) {
    assert.ok(ENEMIES[k], `falta enemigo ${k}`);
    assert.ok(ENEMIES[k].behavior, `${k} sin comportamiento`);
    assert.ok(ENEMIES[k].hp > 0);
  }
});
test('6 power-ups con pesos válidos', () => {
  const keys = Object.keys(POWERUPS);
  assert.ok(keys.length >= 6, 'al menos 6 power-ups');
  for (const k of keys) assert.ok(POWERUPS[k].weight > 0);
  for (let i = 0; i < 200; i++) {
    assert.ok(POWERUPS[pickPowerUpType()], 'tipo de power-up inválido');
  }
});
test('jefe con fase y salud', () => {
  assert.ok(BOSS.maxHealth > 0);
  assert.ok(BOSS.radius > 100);
  assert.equal(typeof BOSS.enterY, 'number');
});

console.log(`\n${passed} pruebas superadas${process.exitCode ? ' (CON FALLOS)' : ''}`);
