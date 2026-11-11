/* ============================================================
   AudioSystem — Web Audio API para SFX + <audio> para música
   Respeta la política de autoplay del navegador (unlock en el
   primer gesto del usuario)
   ============================================================ */

export class AudioSystem {
  constructor(assets) {
    this.assets = assets;
    this.ctx = null;
    this.sfxGain = null;
    this.musicVol = 0.7;
    this.sfxVol = 0.9;
    this.buffers = {};
    this.unlocked = false;

    this.currentMusic = null;
    this.currentMusicName = null;
    this.musicEls = {};
    this._fadeTimer = null;
    this._pendingTrack = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVol;
    this.sfxGain.connect(this.ctx.destination);

    // predecodificar SFX
    for (const [name, buf] of Object.entries(this.assets.audioBuffers)) {
      if (!buf) continue;
      try {
        this.ctx.decodeAudioData(
          buf.slice(0),
          (decoded) => { this.buffers[name] = decoded; },
          () => { /* archivo no decodable */ }
        );
      } catch { /* noop */ }
    }
  }

  unlock() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.unlocked) {
      this.unlocked = true;
      if (this._pendingTrack) {
        const t = this._pendingTrack;
        this._pendingTrack = null;
        this.playMusic(t.name, t.loop, t.fade);
      }
    }
  }

  setMusicVolume(v) {
    this.musicVol = v;
    if (this.currentMusic) this.currentMusic.volume = v;
  }

  setSfxVolume(v) {
    this.sfxVol = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  playSfx(name, { rate = 1, gain = 1, detune = 0 } = {}) {
    if (!this.ctx || !this.buffers[name]) return;
    if (this.ctx.state === 'suspended') return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffers[name];
      src.playbackRate.value = rate;
      if (detune) src.detune.value = detune;
      const g = this.ctx.createGain();
      g.gain.value = gain;
      src.connect(g);
      g.connect(this.sfxGain);
      src.start();
    } catch { /* noop */ }
  }

  _getMusicEl(name) {
    if (this.musicEls[name]) return this.musicEls[name];
    const url = this.assets.musicUrls[name];
    if (!url) return null;
    const el = new Audio(url);
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;
    this.musicEls[name] = el;
    return el;
  }

  playMusic(name, { fade = 0.8 } = {}) {
    if (!name) return;
    if (this.currentMusicName === name && this.currentMusic && !this.currentMusic.paused) return;

    if (!this.unlocked) {
      this._pendingTrack = { name, fade };
      return;
    }

    const next = this._getMusicEl(name);
    if (!next) return;

    const prev = this.currentMusic;
    clearInterval(this._fadeTimer);

    if (prev && prev !== next) {
      const startVol = prev.volume;
      let t = 0;
      const fadeOut = setInterval(() => {
        t += 0.05;
        const k = Math.min(1, t / (fade / 2));
        prev.volume = Math.max(0, startVol * (1 - k));
        if (k >= 1) {
          clearInterval(fadeOut);
          prev.pause();
          prev.currentTime = 0;
        }
      }, 50);
    }

    next.volume = 0;
    next.currentTime = 0;
    const p = next.play();
    if (p && p.catch) p.catch(() => { this._pendingTrack = { name, fade }; });

    let t = 0;
    const fadeIn = setInterval(() => {
      t += 0.05;
      const k = Math.min(1, t / fade);
      next.volume = this.musicVol * k;
      if (k >= 1) clearInterval(fadeIn);
    }, 50);

    this.currentMusic = next;
    this.currentMusicName = name;
  }

  stopMusic(fade = 0.5) {
    clearInterval(this._fadeTimer);
    const prev = this.currentMusic;
    if (!prev) return;
    const startVol = prev.volume;
    let t = 0;
    const iv = setInterval(() => {
      t += 0.05;
      const k = Math.min(1, t / fade);
      prev.volume = Math.max(0, startVol * (1 - k));
      if (k >= 1) {
        clearInterval(iv);
        prev.pause();
        prev.currentTime = 0;
      }
    }, 50);
    this.currentMusic = null;
    this.currentMusicName = null;
  }

  pauseMusic() {
    if (this.currentMusic) this.currentMusic.pause();
  }

  resumeMusic() {
    if (this.currentMusic && this.unlocked) {
      const p = this.currentMusic.play();
      if (p && p.catch) p.catch(() => {});
    }
  }
}
