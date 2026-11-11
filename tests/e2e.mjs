/* ============================================================
   Prueba E2E con puppeteer-core + Chrome del sistema
   Ejecutar: node tests/e2e.mjs
   ============================================================ */

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const URL = process.env.URL || 'http://localhost:5173/';
const SHOTS = '/tmp/opencode/shots';
fs.mkdirSync(SHOTS, { recursive: true });

const errors = [];
const warnings = [];

function log(...a) { console.log('[e2e]', ...a); }

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--window-size=1920,1080',
    '--autoplay-policy=no-user-gesture-required',
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  page.on('console', (msg) => {
    const t = msg.type();
    const text = msg.text();
    if (t === 'error') errors.push(text);
    if (t === 'warning') warnings.push(text);
    if (t === 'error' || t === 'warning') log(`console.${t}:`, text.slice(0, 300));
  });
  page.on('pageerror', (err) => {
    errors.push(String(err));
    log('pageerror:', String(err).slice(0, 400));
  });
  page.on('requestfailed', (req) => {
    const u = req.url();
    if (u.includes('favicon')) return;
    const err = req.failure()?.errorText || 'unknown';
    // ERR_ABORTED en medios = interrupción normal de carga (p. ej. cambiar de pista)
    if (err.includes('ERR_ABORTED')) {
      warnings.push(`aborted: ${u}`);
      log('abortado (inofensivo):', u.split('/').pop(), err);
      return;
    }
    errors.push(`requestfailed: ${u} (${err})`);
    log('requestfailed:', u, err);
  });

  log('abriendo', URL);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // ---- espera del menú principal ----
  await page.waitForSelector('#screen-menu:not(.hidden)', { timeout: 60000 });
  log('menú principal visible');

  const loadInfo = await page.evaluate(() => {
    const g = window.__nebula;
    const missingTex = Object.entries(g.assets.textures)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    const missingSfx = Object.entries(g.assets.audioBuffers)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    const missingMusic = Object.entries(g.assets.musicUrls)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    return {
      loaded: g.assets.loaded,
      total: g.assets.total,
      textures: Object.keys(g.assets.textures).filter((k) => g.assets.textures[k]).length,
      sfx: Object.keys(g.assets.audioBuffers).filter((k) => g.assets.audioBuffers[k]).length,
      music: Object.keys(g.assets.musicUrls).filter((k) => g.assets.musicUrls[k]).length,
      missingTex,
      missingSfx,
      missingMusic,
      state: g.state,
    };
  });
  log('assets:', JSON.stringify(loadInfo));
  await page.screenshot({ path: `${SHOTS}/01_menu.png` });

  // ---- iniciar partida ----
  await page.click('#btn-play');
  await new Promise((r) => setTimeout(r, 1200));
  let state = await page.evaluate(() => window.__nebula.state);
  log('estado tras JUGAR:', state);

  // ---- jugar con teclado unos segundos ----
  await page.keyboard.down('Space');
  const moveSeq = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'];
  for (let i = 0; i < 8; i++) {
    const k = moveSeq[i % moveSeq.length];
    await page.keyboard.down(k);
    await new Promise((r) => setTimeout(r, 550));
    await page.keyboard.up(k);
  }
  await page.keyboard.up('Space');

  const mid = await page.evaluate(() => {
    const g = window.__nebula;
    const s = g.gameScene;
    return {
      state: g.state,
      score: s.score.score,
      kills: s.score.kills,
      wave: s.waveNumber,
      aliveEnemies: s.enemies.filter((e) => e.alive).length,
      playerShots: s.projectiles.playerBullets.length,
      enemyShots: s.projectiles.enemyBullets.length,
      health: s.player.health,
      shield: s.player.shield,
      particles: s.particles.pool.filter((p) => p.userData.alive).length,
    };
  });
  log('partida en marcha:', JSON.stringify(mid));
  await page.screenshot({ path: `${SHOTS}/02_gameplay.png` });

  const musicInfo = await page.evaluate(() => {
    const a = window.__nebula.audio;
    return {
      unlocked: a.unlocked,
      ctxState: a.ctx ? a.ctx.state : null,
      track: a.currentMusicName,
      paused: a.currentMusic ? a.currentMusic.paused : null,
      volume: a.currentMusic ? Number(a.currentMusic.volume.toFixed(2)) : null,
      sfxDecoded: Object.keys(a.buffers).length,
    };
  });
  log('audio:', JSON.stringify(musicInfo));

  // ---- pausa ----
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));
  const paused = await page.evaluate(() => window.__nebula.state);
  log('estado tras ESC:', paused);
  await page.screenshot({ path: `${SHOTS}/03_pause.png` });
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));

  // ---- recoger power-up forzado (prueba de lógica) ----
  const pu = await page.evaluate(() => {
    const g = window.__nebula;
    const s = g.gameScene;
    s.powerups.spawn(s.player.x, s.player.y + 10, 'weapon');
    const before = s.player.weaponLevels.join(',');
    return { before };
  });
  await new Promise((r) => setTimeout(r, 700));
  const puAfter = await page.evaluate(() => {
    const s = window.__nebula.gameScene;
    return { levels: s.player.weaponLevels.join(','), bombs: s.bombs };
  });
  log('power-up arma:', pu.before, '->', puAfter.levels);

  // ---- jefe: invocar directamente y derrotarlo ----
  await page.evaluate(() => {
    const s = window.__nebula.gameScene;
    // limpiar enemigos para aislar el test del jefe
    for (const e of s.enemies) e.setVisible(false);
    s.waves.state = 'boss';
    s._spawnBoss();
  });
  await new Promise((r) => setTimeout(r, 3500)); // entrada del jefe
  const bossInfo = await page.evaluate(() => {
    const b = window.__nebula.gameScene.boss;
    return { state: b.state, phase: b.phase, hp: b.health };
  });
  log('jefe:', JSON.stringify(bossInfo));
  await page.screenshot({ path: `${SHOTS}/04_boss.png` });

  // disparar al jefe hasta las fases
  await page.keyboard.down('Space');
  await new Promise((r) => setTimeout(r, 4000));
  const phaseInfo = await page.evaluate(() => {
    const b = window.__nebula.gameScene.boss;
    return { state: b.state, phase: b.phase, hp: Math.round(b.health), attack: b.attackName };
  });
  log('jefe tras fuego:', JSON.stringify(phaseInfo));
  await page.screenshot({ path: `${SHOTS}/05_boss_fight.png` });

  // matar al jefe para validar victoria
  await page.evaluate(() => {
    const s = window.__nebula.gameScene;
    s.boss.health = 1;
    s.boss.damage(50);
  });
  await page.waitForFunction(
    () => !document.getElementById('screen-victory').classList.contains('hidden'),
    { timeout: 15000 }
  ).catch(() => log('AVISO: la pantalla de victoria no apareció en 15 s'));
  const victory = await page.evaluate(() => ({
    state: window.__nebula.state,
    screen: !document.getElementById('screen-victory').classList.contains('hidden'),
    score: Math.round(window.__nebula.gameScene.score.score),
    record: window.__nebula.gameScene.score.record,
  }));
  log('victoria:', JSON.stringify(victory));
  await page.screenshot({ path: `${SHOTS}/06_victory.png` });

  // ---- reinicio sin recargar ----
  await page.waitForSelector('#btn-v-retry', { visible: true, timeout: 5000 });
  await page.click('#btn-v-retry');
  await new Promise((r) => setTimeout(r, 1000));
  const restarted = await page.evaluate(() => {
    const g = window.__nebula;
    return {
      state: g.state,
      score: g.gameScene.score.score,
      health: g.gameScene.player.health,
      wave: g.gameScene.waveNumber,
      enemies: g.gameScene.enemies.filter((e) => e.alive).length,
    };
  });
  log('reinicio:', JSON.stringify(restarted));

  // ---- derrota y game over ----
  await page.evaluate(() => {
    const s = window.__nebula.gameScene;
    s.player.invuln = 0;
    s.player.shield = 0;
    s._damagePlayer(999);
  });
  await page.waitForFunction(
    () => !document.getElementById('screen-gameover').classList.contains('hidden'),
    { timeout: 10000 }
  ).catch(() => log('AVISO: game over no apareció en 10 s'));
  const gameover = await page.evaluate(() => ({
    state: window.__nebula.state,
    screen: !document.getElementById('screen-gameover').classList.contains('hidden'),
  }));
  log('game over:', JSON.stringify(gameover));
  await page.screenshot({ path: `${SHOTS}/07_gameover.png` });

  // récord persistente
  await page.waitForSelector('#btn-retry', { visible: true, timeout: 8000 }).catch(() => {});
  await page.click('#btn-retry');
  await new Promise((r) => setTimeout(r, 800));
  const record = await page.evaluate(() => localStorage.getItem('nebula_strike_record'));
  log('récord en localStorage:', record);

  // ---- volver al menú ----
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));
  await page.click('#btn-quit');
  await new Promise((r) => setTimeout(r, 800));
  const backMenu = await page.evaluate(() => window.__nebula.state);
  log('estado tras abandonar:', backMenu);
  await page.screenshot({ path: `${SHOTS}/08_menu_return.png` });

  // ---- progresión de oleadas hasta el jefe ----
  await page.click('#btn-play');
  await new Promise((r) => setTimeout(r, 600));
  const wavesSeen = [];
  for (let i = 0; i < 9; i++) {
    // acelerar la cola de apariciones y limpiar enemigos
    await page.evaluate(() => {
      const s = window.__nebula.gameScene;
      s.waves.elapsed = 1e6;
    });
    await new Promise((r) => setTimeout(r, 700));
    await page.evaluate(() => {
      const s = window.__nebula.gameScene;
      for (const e of s.enemies) {
        if (e.alive) { e.hp = 0; s._killEnemy(e); }
      }
    });
    if (i === 2) await page.screenshot({ path: `${SHOTS}/10_explosions.png` });
    await new Promise((r) => setTimeout(r, 3400));
    const info = await page.evaluate(() => {
      const s = window.__nebula.gameScene;
      return { wave: s.waveNumber, state: s.waves.state, boss: s.bossSpawned };
    });
    wavesSeen.push(info);
    if (info.boss) break;
  }
  log('progresión de oleadas:', JSON.stringify(wavesSeen));

  // ---- rendimiento (FPS) ----
  const fps = await page.evaluate(
    () =>
      new Promise((res) => {
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
  log('FPS medios (3 s):', fps);

  // ---- armas, especial y bomba ----
  const abilities = await page.evaluate(() => {
    const g = window.__nebula;
    const s = g.gameScene;
    return { weapon: s.player.weaponIndex, charges: s.player.specialCharges, bombs: s.bombs };
  });
  await page.keyboard.press('Digit2');
  await new Promise((r) => setTimeout(r, 250));
  const afterWeapon = await page.evaluate(() => window.__nebula.gameScene.player.weaponIndex);

  await page.keyboard.down('Shift');
  await page.keyboard.up('Shift');
  await new Promise((r) => setTimeout(r, 200));
  const afterSpecial = await page.evaluate(() => ({
    beam: !!window.__nebula.gameScene.beam,
    charges: window.__nebula.gameScene.player.specialCharges,
  }));
  await page.screenshot({ path: `${SHOTS}/11_special_beam.png` });

  // forzar bomba: sin cargas de especial
  const bombResult = await page.evaluate(() => {
    const s = window.__nebula.gameScene;
    s.player.specialCharges = 0;
    const before = s.bombs;
    return { before };
  });
  await page.keyboard.down('Shift');
  await page.keyboard.up('Shift');
  await new Promise((r) => setTimeout(r, 300));
  const bombAfter = await page.evaluate(() => window.__nebula.gameScene.bombs);
  log(
    'armas/especial/bomba:',
    JSON.stringify({ abilities, afterWeapon, afterSpecial, bombResult, bombAfter })
  );

  // ---- volver al menú ----
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));
  await page.click('#btn-quit');
  await new Promise((r) => setTimeout(r, 600));

  // ---- opciones ----
  await page.click('#btn-options');
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: `${SHOTS}/09_options.png` });

  log('--- resumen ---');
  log('errores:', errors.length);
  log('avisos:', warnings.length);
  if (errors.length) {
    log('ERRORES DETALLADOS:');
    errors.slice(0, 30).forEach((e) => log(' -', e.slice(0, 300)));
  }
} catch (err) {
  console.error('[e2e] FALLO:', err);
  errors.push(String(err));
} finally {
  await browser.close();
}

process.exit(errors.length > 0 ? 1 : 0);
