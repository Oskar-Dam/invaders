/* ============================================================
   Game — bucle principal, máquina de estados y wiring
   ============================================================ */

import * as THREE from 'three';
import { Renderer } from './Renderer.js';
import { AssetManager } from './AssetManager.js';
import { Input } from './Input.js';
import { BackgroundSystem } from '../systems/BackgroundSystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { HUD } from '../ui/HUD.js';
import { Menus } from '../ui/Menus.js';
import { GameScene } from '../scenes/GameScene.js';
import { loadRecord, loadSettings, saveSettings } from './config.js';

const MAX_DT = 1 / 20;

export class Game {
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.assets = new AssetManager();
    this.input = new Input();
    this.settings = loadSettings();
    this.record = loadRecord();

    this.state = 'loading';
    this.time = 0;
    this._raf = 0;

    this.hud = new HUD();
    this.audio = new AudioSystem(this.assets);

    this.menus = new Menus({
      onPlay: () => this.startGame(),
      onResume: () => this.resume(),
      onQuit: () => this.quitToMenu(),
      onRetry: () => this.startGame(),
      onUiClick: () => this.audio.playSfx('ui_click', { gain: 0.6 }),
      onSettingsChange: (s) => this.applySettings(s),
    });

    this._bindGlobalEvents();
  }

  /* ---------------- arranque ---------------- */
  async boot() {
    const fill = document.getElementById('load-fill');
    const text = document.getElementById('load-text');

    this.assets.onProgress = (frac, label) => {
      fill.style.width = `${Math.round(frac * 100)}%`;
      if (label) text.textContent = `LOADING ${label.toUpperCase()}`;
    };

    await this.assets.loadAll();

    // sistemas que dependen de assets
    this.background = new BackgroundSystem(this.renderer.scene, this.assets);

    this.gameScene = new GameScene({
      renderer: this.renderer,
      assets: this.assets,
      input: this.input,
      audio: this.audio,
      hud: this.hud,
      settings: () => this.settings,
      background: this.background,
      callbacks: {
        onGameOver: (r) => this.onGameOver(r),
        onVictory: (r) => this.onVictory(r),
      },
    });

    // controles táctiles
    const zone = document.getElementById('joystick-zone');
    const base = document.getElementById('joystick-base');
    const knob = document.getElementById('joystick-knob');
    const special = document.getElementById('btn-special');
    this.input.attachTouchControls(zone, base, knob, special);

    this.applySettings(this.settings);
    this.menus.showRecord(this.record);

    text.textContent = 'READY';
    fill.style.width = '100%';

    setTimeout(() => {
      this.setState('menu');
    }, 350);

    this.loop();
  }

  /* ---------------- eventos globales ---------------- */
  _bindGlobalEvents() {
    const unlock = () => {
      this.audio.unlock();
    };
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        if (this.state === 'menu') {
          e.preventDefault();
          this.startGame();
        } else if (this.state === 'gameover' || this.state === 'victory') {
          e.preventDefault();
          this.startGame();
        }
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });

    this._checkOrientation();
    window.addEventListener('resize', () => this._checkOrientation());
  }

  _checkOrientation() {
    const portrait = window.innerHeight > window.innerWidth;
    const small = Math.min(window.innerWidth, window.innerHeight) < 480;
    const touch = this.input.isTouchDevice || 'ontouchstart' in window;
    this.showRotateHint = portrait && small && touch && this.state === 'playing';
    if (this.showRotateHint) this.menus.show('screen-rotate');
    else if (this.menus.current === 'screen-rotate') this.menus.hide('screen-rotate');
  }

  applySettings(s) {
    this.settings = s;
    this.audio.setMusicVolume(s.music / 100);
    this.audio.setSfxVolume(s.sfx / 100);
    saveSettings(s);
  }

  /* ---------------- transiciones ---------------- */
  setState(s) {
    this.state = s;

    const touch = this.input.isTouchDevice || 'ontouchstart' in window;
    const touchUI = touch && s === 'playing';
    document.getElementById('touch-controls').classList.toggle('hidden', !touchUI);

    if (s === 'menu') {
      this.menus.show('screen-menu');
      this.hud.hide();
      this.menus.showRecord(this.record);
      this.audio.playMusic('menu');
      this.gameScene.destroy();
      this.background.setBoost(0.4);
    } else if (s === 'playing') {
      this.menus.hideAll();
      this.hud.show();
      this.background.setBoost(1);
    } else if (s === 'paused') {
      this.menus.show('screen-pause');
    } else if (s === 'gameover') {
      this.hud.hide();
    } else if (s === 'victory') {
      this.hud.hide();
    }
    this._checkOrientation();
  }

  startGame() {
    this.audio.unlock();
    this.input.clear();
    this.gameScene.start();
    this.setState('playing');
    this.hud.show();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.gameScene.pause();
    this.setState('paused');
    this.audio.pauseMusic();
    this.audio.playSfx('ui_back', { gain: 0.7 });
  }

  resume() {
    if (this.state !== 'paused') return;
    this.gameScene.resume();
    this.setState('playing');
    this.audio.resumeMusic();
    this.audio.playSfx('ui_click', { gain: 0.7 });
  }

  quitToMenu() {
    this.gameScene.destroy();
    this.input.clear();
    this.setState('menu');
  }

  onGameOver(result) {
    this.state = 'gameover';
    this.record = this.gameScene.score.record;
    this.hud.hide();
    document.getElementById('touch-controls').classList.add('hidden');
    this.menus.showGameOver(result);
    this.background.setBoost(0.5);
  }

  onVictory(result) {
    this.state = 'victory';
    this.record = this.gameScene.score.record;
    this.hud.hide();
    document.getElementById('touch-controls').classList.add('hidden');
    this.menus.showVictory(result);
    this.audio.playMusic('menu');
    this.background.setBoost(0.8);
  }

  /* ---------------- bucle ---------------- */
  loop = () => {
    this._raf = requestAnimationFrame(this.loop);

    const now = performance.now() / 1000;
    let dt = now - this.time;
    this.time = now;
    if (!isFinite(dt) || dt < 0) dt = 0;
    dt = Math.min(dt, MAX_DT);

    // fondo siempre animado (menú y partida)
    this.background.update(dt, this.renderer.halfW, this.renderer.halfH);

    if (this.state === 'playing' || this.state === 'paused') {
      if (this.state === 'playing') {
        if (this.input.consumePause()) {
          this.pause();
        } else {
          this.gameScene.update(dt);
        }
      } else if (this.input.consumePause()) {
        this.resume();
      }
    } else if (this.state === 'menu') {
      // la nave del jugador "respira" en el menú como decoración
      const p = this.gameScene.player;
      p.sprite.visible = true;
      p.thruster.visible = true;
      p.setPosition(0, -378 + Math.sin(this.time * 1.8) * 12);
      p.thruster.material.opacity = 0.65 + Math.sin(this.time * 24) * 0.12;
      if (Math.random() < dt * 8 && this.settings.particles) {
        this.gameScene.particles.thruster(p.x + (Math.random() - 0.5) * 16, p.y - 66);
      }
      this.gameScene.particles.update(dt);
      this.gameScene.fx.update(dt, this.renderer.halfW, this.renderer.halfH);
    } else if (this.state === 'gameover' || this.state === 'victory') {
      // los efectos remanentes siguen animándose tras la partida
      this.gameScene.particles.update(dt);
      this.gameScene.fx.update(dt, this.renderer.halfW, this.renderer.halfH);
    }

    this.renderer.updateShake(dt);
    this.renderer.render();
  };
}
