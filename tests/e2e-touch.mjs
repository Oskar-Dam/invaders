/* ============================================================
   Prueba de controles táctiles y adaptación a móvil
   Ejecutar: node tests/e2e-touch.mjs
   ============================================================ */

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const URL = process.env.URL || 'http://localhost:5173/';
const SHOTS = '/tmp/opencode/shots';
fs.mkdirSync(SHOTS, { recursive: true });

const errors = [];
const log = (...a) => console.log('[touch]', ...a);

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--autoplay-policy=no-user-gesture-required',
  ],
});

try {
  // ---------- móvil horizontal ----------
  const page = await browser.newPage();
  await page.setViewport({ width: 844, height: 390, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => { errors.push(String(e)); log('pageerror:', String(e).slice(0, 300)); });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#screen-menu:not(.hidden)', { timeout: 60000 });
  log('menú visible en móvil horizontal');
  await page.screenshot({ path: `${SHOTS}/m01_menu.png` });

  await page.tap('#btn-play');
  await new Promise((r) => setTimeout(r, 1200));

  const touchVisible = await page.evaluate(
    () => !document.getElementById('touch-controls').classList.contains('hidden')
  );
  log('controles táctiles visibles:', touchVisible);

  // ---- joystick virtual: arrastre ----
  const before = await page.evaluate(() => {
    const p = window.__nebula.gameScene.player;
    return { x: Math.round(p.x), y: Math.round(p.y) };
  });

  await page.touchscreen.touchStart(180, 260);
  for (let i = 0; i < 12; i++) {
    await page.touchscreen.touchMove(180 + i * 8, 260 - i * 10);
    await new Promise((r) => setTimeout(r, 40));
  }
  const during = await page.evaluate(() => ({
    tm: { ...window.__nebula.input.touchMove },
    px: Math.round(window.__nebula.gameScene.player.x),
    py: Math.round(window.__nebula.gameScene.player.y),
  }));
  await page.screenshot({ path: `${SHOTS}/m02_joystick.png` });
  await page.touchscreen.touchEnd();
  await new Promise((r) => setTimeout(r, 300));

  const after = await page.evaluate(() => {
    const p = window.__nebula.gameScene.player;
    return { x: Math.round(p.x), y: Math.round(p.y), moved: null };
  });
  log('joystick:', JSON.stringify({ before, during, after }));

  // ---- disparo táctil (toque en zona derecha) ----
  await page.touchscreen.touchStart(700, 200);
  await new Promise((r) => setTimeout(r, 500));
  const firing = await page.evaluate(() => ({
    touchFire: window.__nebula.input.touchFire,
    bullets: window.__nebula.gameScene.projectiles.playerBullets.length,
  }));
  await page.touchscreen.touchEnd();
  log('disparo táctil:', JSON.stringify(firing));
  await page.screenshot({ path: `${SHOTS}/m03_firing.png` });

  // ---- botón especial ----
  await page.tap('#btn-special');
  await new Promise((r) => setTimeout(r, 250));
  const special = await page.evaluate(() => ({
    beam: !!window.__nebula.gameScene.beam,
    charges: window.__nebula.gameScene.player.specialCharges,
  }));
  log('especial táctil:', JSON.stringify(special));

  // ---------- móvil vertical: aviso de giro ----------
  const portrait = await browser.newPage();
  await portrait.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  portrait.on('pageerror', (e) => { errors.push(String(e)); });
  await portrait.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await portrait.waitForSelector('#screen-menu:not(.hidden)', { timeout: 60000 });
  await portrait.tap('#btn-play');
  await new Promise((r) => setTimeout(r, 900));
  const rotateShown = await portrait.evaluate(
    () => !document.getElementById('screen-rotate').classList.contains('hidden')
  );
  log('aviso de giro en vertical:', rotateShown);
  await portrait.screenshot({ path: `${SHOTS}/m04_portrait.png` });

  // el juego sigue funcionando en vertical (sin romperse)
  const portraitState = await portrait.evaluate(() => ({
    state: window.__nebula.state,
    halfW: Math.round(window.__nebula.renderer.halfW),
    halfH: Math.round(window.__nebula.renderer.halfH),
  }));
  log('vertical:', JSON.stringify(portraitState));

  log('--- resumen ---');
  log('errores:', errors.length);
  errors.slice(0, 10).forEach((e) => log(' -', e.slice(0, 250)));
} catch (err) {
  console.error('[touch] FALLO:', err);
  errors.push(String(err));
} finally {
  await browser.close();
}

process.exit(errors.length > 0 ? 1 : 0);
