/* ============================================================
   Menus — gestión de pantallas, opciones y botones
   ============================================================ */

import { loadSettings, saveSettings } from '../core/config.js';

const SCREENS = [
  'screen-loading', 'screen-menu', 'screen-controls', 'screen-options',
  'screen-pause', 'screen-gameover', 'screen-victory', 'screen-rotate',
];

export class Menus {
  constructor(handlers) {
    this.h = handlers;
    this.settings = loadSettings();
    this.current = 'screen-loading';
    this.previous = 'screen-menu';
    this.optionsReturn = 'screen-menu';

    this.el = {};
    for (const id of SCREENS) this.el[id] = document.getElementById(id);

    this._bind();
    this._applySettingsToInputs();
  }

  _bind() {
    const $ = (id) => document.getElementById(id);

    $('btn-play').addEventListener('click', () => { this.click(); this.h.onPlay(); });
    $('btn-controls').addEventListener('click', () => { this.click(); this.show('screen-controls'); });
    $('btn-options').addEventListener('click', () => {
      this.click();
      this.optionsReturn = 'screen-menu';
      this.show('screen-options');
    });
    $('btn-resume').addEventListener('click', () => { this.click(); this.h.onResume(); });
    $('btn-pause-options').addEventListener('click', () => {
      this.click();
      this.optionsReturn = 'screen-pause';
      this.show('screen-options');
    });
    $('btn-quit').addEventListener('click', () => { this.click(); this.h.onQuit(); });
    $('btn-retry').addEventListener('click', () => { this.click(); this.h.onRetry(); });
    $('btn-go-menu').addEventListener('click', () => { this.click(); this.h.onQuit(); });
    $('btn-v-retry').addEventListener('click', () => { this.click(); this.h.onRetry(); });
    $('btn-v-menu').addEventListener('click', () => { this.click(); this.h.onQuit(); });

    document.querySelectorAll('[data-back]').forEach((b) => {
      b.addEventListener('click', () => {
        this.click();
        this.show(this.optionsReturn);
      });
    });

    // opciones
    const music = $('opt-music');
    const sfx = $('opt-sfx');
    const autofire = $('opt-autofire');
    const shake = $('opt-shake');
    const particles = $('opt-particles');

    const update = () => {
      this.settings.music = parseInt(music.value, 10);
      this.settings.sfx = parseInt(sfx.value, 10);
      this.settings.autofire = autofire.checked;
      this.settings.shake = shake.checked;
      this.settings.particles = particles.checked;
      saveSettings(this.settings);
      if (this.h.onSettingsChange) this.h.onSettingsChange(this.settings);
    };

    music.addEventListener('input', update);
    sfx.addEventListener('input', update);
    autofire.addEventListener('change', update);
    shake.addEventListener('change', update);
    particles.addEventListener('change', update);
  }

  _applySettingsToInputs() {
    const $ = (id) => document.getElementById(id);
    $('opt-music').value = this.settings.music;
    $('opt-sfx').value = this.settings.sfx;
    $('opt-autofire').checked = this.settings.autofire;
    $('opt-shake').checked = this.settings.shake;
    $('opt-particles').checked = this.settings.particles;
  }

  click() {
    if (this.h.onUiClick) this.h.onUiClick();
  }

  show(id) {
    if (this.current && this.el[this.current]) {
      this.el[this.current].classList.add('hidden');
    }
    this.previous = this.current;
    this.current = id;
    if (this.el[id]) {
      this.el[id].classList.remove('hidden');
      // reiniciar animación de entrada
      this.el[id].style.animation = 'none';
      void this.el[id].offsetWidth;
      this.el[id].style.animation = '';
    }
  }

  hide(id) {
    if (this.el[id]) this.el[id].classList.add('hidden');
  }

  hideAll() {
    for (const id of SCREENS) this.el[id].classList.add('hidden');
    this.current = null;
  }

  isScreenVisible(id) {
    return this.el[id] && !this.el[id].classList.contains('hidden');
  }

  showRecord(v) {
    document.getElementById('menu-record').textContent = Math.round(v).toLocaleString('es-ES');
  }

  showGameOver({ score, record, wave, kills, newRecord }) {
    document.getElementById('go-score').textContent = Math.round(score).toLocaleString('es-ES');
    document.getElementById('go-record').textContent = Math.round(record).toLocaleString('es-ES');
    document.getElementById('go-wave').textContent = String(wave);
    document.getElementById('go-kills').textContent = String(kills);
    document.getElementById('new-record').classList.toggle('hidden', !newRecord);
    this.show('screen-gameover');
  }

  showVictory({ score, record, kills, newRecord }) {
    document.getElementById('v-score').textContent = Math.round(score).toLocaleString('es-ES');
    document.getElementById('v-record').textContent = Math.round(record).toLocaleString('es-ES');
    document.getElementById('v-kills').textContent = String(kills);
    document.getElementById('new-record-v').classList.toggle('hidden', !newRecord);
    this.show('screen-victory');
  }
}
