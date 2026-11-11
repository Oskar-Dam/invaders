/* Prueba focalizada: fases del jefe + rendimiento limpio
   Ejecutar: node tests/e2e-boss.mjs */

import puppeteer from 'puppeteer-core';

const URL = process.env.URL || 'http://localhost:5173/';
const log = (...a) => console.log('[boss]', ...a);
const errors = [];
let failures = 0;

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: [
    '--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader',
    '--use-gl=angle', '--use-angle=swiftshader', '--window-size=1920,1080',
    '--autoplay-policy=no-user-gesture-required',
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  page.on('pageerror', (e) => { errors.push(String(e)); log('pageerror:', String(e).slice(0, 300)); });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#screen-menu:not(.hidden)', { timeout: 60000 });
  await page.click('#btn-play');
  await new Promise((r) => setTimeout(r, 700));

  // Invocar jefe directamente y dejarlo entrar en combate
  await page.evaluate(() => {
    const s = window.__nebula.gameScene;
    for (const e of s.enemies) e.setVisible(false);
    s.waves.state = 'boss';
    s._spawnBoss();
    // acelerar la entrada
    s.boss.enterTarget = s.boss.y;
  });
  await new Promise((r) => setTimeout(r, 900));

  const phases = [];
  const snap = async (label) => {
    const st = await page.evaluate(() => {
      const b = window.__nebula.gameScene.boss;
      return { state: b.state, phase: b.phase, hp: Math.round(b.health), attack: b.attackName };
    });
    phases.push({ label, ...st });
    log(label, JSON.stringify(st));
    return st;
  };
  await snap('entrada');

  // Fase 1 → 2 usando la ruta REAL (bala del jugador → colisión → banner)
  await page.evaluate(() => {
    const s = window.__nebula.gameScene;
    const b = s.boss;
    b.health = b.maxHealth * 0.6 + 4; // una bala de 12 daña y cruza el umbral
    // colocar la nave justo bajo el jefe y disparar
    s.player.setPosition(b.x, b.y - 320);
    for (let i = 0; i < 4; i++) {
      s.projectiles.spawnPlayer(b.x + i * 6, b.y - 300 + i * 10, 0, 12, 1.5);
    }
  });
  await new Promise((r) => setTimeout(r, 400));
  await snap('trás bala real a 60%');
  const banner2 = await page.evaluate(() => ({
    text: document.getElementById('wave-banner').textContent,
    shown: document.getElementById('wave-banner').classList.contains('show'),
  }));
  log('banner fase 2:', JSON.stringify(banner2));
  if (!banner2.text.includes('PHASE 2') || !banner2.shown) { failures++; log('banner fase 2: FALLO'); }
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: '/tmp/opencode/shots/12_boss_phase2.png' });

  // Fase 2 → 3 por la misma ruta
  await page.evaluate(() => {
    const s = window.__nebula.gameScene;
    const b = s.boss;
    b.health = b.maxHealth * 0.3 + 4;
    s.player.setPosition(b.x, b.y - 320);
    for (let i = 0; i < 4; i++) {
      s.projectiles.spawnPlayer(b.x + i * 6, b.y - 300 + i * 10, 0, 12, 1.5);
    }
  });
  await new Promise((r) => setTimeout(r, 400));
  await snap('tras bala real a 30%');
  const banner3 = await page.evaluate(() => ({
    text: document.getElementById('wave-banner').textContent,
    shown: document.getElementById('wave-banner').classList.contains('show'),
  }));
  log('banner fase 3:', JSON.stringify(banner3));
  if (!banner3.text.includes('PHASE 3') || !banner3.shown) { failures++; log('banner fase 3: FALLO'); }

  // Dejar que ejecute ataques de fase 3 (esperar beam_sweep u otros)
  const seenAttacks = new Set();
  for (let i = 0; i < 14; i++) {
    await new Promise((r) => setTimeout(r, 700));
    const a = await page.evaluate(() => {
      const b = window.__nebula.gameScene.boss;
      return { attack: b.attackName, beam: b.beamState, phase: b.phase };
    });
    seenAttacks.add(a.attack);
    if (a.beam === 'sweep') {
      log('¡barrido láser activo!', JSON.stringify(a));
      await page.screenshot({ path: '/tmp/opencode/shots/13_boss_beam.png' });
    }
  }
  log('ataques observados en fase 3:', [...seenAttacks].join(', '));

  // Forzar el barrido láser para validar telegraph + barrido + daño
  await page.evaluate(() => {
    const b = window.__nebula.gameScene.boss;
    b._startAttack('beam_sweep');
    b.attackTimer = 0;
  });
  await new Promise((r) => setTimeout(r, 450));
  const telegraph = await page.evaluate(() => {
    const b = window.__nebula.gameScene.boss;
    return { beamState: b.beamState, active: b.beam.active, telegraph: b.beam.telegraph, x: Math.round(b.beamX) };
  });
  log('telegraph del barrido:', JSON.stringify(telegraph));
  await page.screenshot({ path: '/tmp/opencode/shots/13_boss_beam_telegraph.png' });

  await new Promise((r) => setTimeout(r, 900));
  const sweep = await page.evaluate(() => {
    const b = window.__nebula.gameScene.boss;
    return { beamState: b.beamState, active: b.beam.active, x: Math.round(b.beamX) };
  });
  log('barrido activo:', JSON.stringify(sweep));
  await page.screenshot({ path: '/tmp/opencode/shots/14_boss_beam_sweep.png' });

  // verificaciones visuales: icono del arma y decals de daño de la nave
  await page.evaluate(() => {
    const s = window.__nebula.gameScene;
    const p = s.player;
    s.state = 'playing';
    p.alive = true;
    p.setPosition(0, -420);   // zona relativamente segura
    p.invuln = 0;
    p.health = 55;            // 55 % → decal de daño nivel 1
    p.sprite.visible = true;
  });
  await new Promise((r) => setTimeout(r, 250));
  const visuals = await page.evaluate(() => {
    const img = document.getElementById('weapon-icon');
    const p = window.__nebula.gameScene.player;
    return {
      iconSrc: img.getAttribute('src'),
      iconLoaded: img.complete && img.naturalWidth > 0,
      hp: Math.round(p.health),
      overlayVisible: p.damageOverlay.visible,
      overlayTex: p.damageOverlay.material.map ? p.damageOverlay.material.map.image?.src.split('/').pop() : null,
      shipTex: p.sprite.material.map.image?.src.split('/').pop(),
    };
  });
  log('visuales:', JSON.stringify(visuals));
  if (!visuals.iconLoaded || !visuals.overlayVisible || visuals.shipTex !== 'player.png') {
    failures++;
    log('visuales: FALLO');
  }
  await page.screenshot({ path: '/tmp/opencode/shots/15_player_damage.png' });

  // daño del barrido al jugador (ruta real): línea base + manipulación en el
  // MISMO evaluate (ningún frame intermedio puede alterar la medición)
  const hpBefore = await page.evaluate(() => {
    const s = window.__nebula.gameScene;
    const b = s.boss;
    b._startAttack('beam_sweep');
    b.beamState = 'sweep';      // saltar el telegraph
    b.beamTimer = 1.5;
    b.beamDir = 1;
    b.beamX = 0;
    b.beam.prevX = 0;
    s.player.setPosition(0, 0); // justo en la banda del rayo
    s.player.invuln = 0;
    s.player.shield = 0;        // sin escudo: medir daño directo al casco
    return s.player.health;
  });
  // esperar a que el barrido arranque de verdad (evita carreras del test)
  await page.waitForFunction(
    () => window.__nebula.gameScene.boss.beam.active === true,
    { timeout: 4000 }
  ).catch(() => log('AVISO: el barrido no se activó'));
  await new Promise((r) => setTimeout(r, 300));
  const beamDmgAfter = await page.evaluate(() => {
    const g = window.__nebula;
    const s = g.gameScene;
    return {
      hp: s.player.health,
      invuln: Number(s.player.invuln.toFixed(2)),
      alive: s.player.alive,
      gameState: g.state,
      sceneState: s.state,
      beamState: s.boss.beamState,
      active: s.boss.beam.active,
      beamX: Math.round(s.boss.beam.x),
      px: Math.round(s.player.x),
    };
  });
  const beamDmg = { hpBefore };
  log('daño del barrido:', JSON.stringify({ ...beamDmg, ...beamDmgAfter }));
  const beamOk = beamDmgAfter.hp < hpBefore;
  log('barrido daña al jugador:', beamOk ? 'OK' : 'FALLO');
  if (!beamOk) failures++;

  // FPS con escena ligera (medición limpia)
  const fps = await page.evaluate(
    () => new Promise((res) => {
      let n = 0;
      const t0 = performance.now();
      const tick = () => {
        n++;
        if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
        else res(Number((n / ((performance.now() - t0) / 1000)).toFixed(1)));
      };
      requestAnimationFrame(tick);
    })
  );
  log('FPS (con jefe activo):', fps);

  // transición a fase 3 ya vista → comprobar cambio de fase registrado
  const phaseSeen = phases.map((p) => p.phase);
  const okPhases = phaseSeen.includes(1) && phaseSeen.includes(2) && phaseSeen.includes(3);
  log('fases observadas:', phaseSeen.join(' → '), okPhases ? 'OK' : 'FALLO');
  if (!okPhases) failures++;

  log('errores:', errors.length, '· fallos de aserción:', failures);
  errors.slice(0, 8).forEach((e) => log(' -', e.slice(0, 250)));
} catch (err) {
  console.error('[boss] FALLO:', err);
  errors.push(String(err));
} finally {
  await browser.close();
}
process.exit(errors.length + failures > 0 ? 1 : 0);
