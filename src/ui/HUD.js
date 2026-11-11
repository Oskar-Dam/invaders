/* ============================================================
   HUD — interfaz durante la partida (DOM)
   ============================================================ */

export class HUD {
  constructor() {
    this.root = document.getElementById('hud');
    this.barHealth = document.getElementById('bar-health');
    this.barShield = document.getElementById('bar-shield');
    this.barSpecial = document.getElementById('bar-special');
    this.barBoss = document.getElementById('bar-boss');
    this.bossBar = document.getElementById('boss-bar');
    this.bossName = document.getElementById('boss-name');
    this.score = document.getElementById('score-value');
    this.mult = document.getElementById('multiplier-value');
    this.record = document.getElementById('record-value');
    this.wave = document.getElementById('wave-value');
    this.weaponName = document.getElementById('weapon-name');
    this.weaponIcon = document.getElementById('weapon-icon');
    this.lives = document.getElementById('hud-lives');
    this.banner = document.getElementById('wave-banner');
    this.combo = document.getElementById('combo-display');
    this.comboValue = document.getElementById('combo-value');

    this._bannerTimer = null;
    this._lastLives = -1;
  }

  show() {
    this.root.classList.remove('hidden');
    this.root.setAttribute('aria-hidden', 'false');
  }

  hide() {
    this.root.classList.add('hidden');
    this.root.setAttribute('aria-hidden', 'true');
  }

  setHealth(frac) {
    this.barHealth.style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
  }

  setShield(frac) {
    this.barShield.style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
  }

  setSpecial(charges, max, regenFrac) {
    const frac = (charges + regenFrac) / max;
    this.barSpecial.style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
    this.barSpecial.parentElement.title = `Especial: ${charges}/${max}`;
  }

  setScore(v) {
    this.score.textContent = Math.round(v).toLocaleString('es-ES');
  }

  setRecord(v) {
    this.record.textContent = `REC ${Math.round(v).toLocaleString('es-ES')}`;
  }

  setMultiplier(m, boost = false) {
    this.mult.textContent = `×${m}`;
    this.mult.style.color = boost ? '#a06bff' : '';
  }

  setWave(n) {
    this.wave.textContent = String(n);
  }

  setWeapon(name, iconUrl) {
    if (this.weaponName.textContent !== name) {
      this.weaponName.textContent = name;
    }
    // el icono se actualiza aunque el nombre no cambie (evita img sin src)
    if (iconUrl && this.weaponIcon.getAttribute('src') !== iconUrl) {
      this.weaponIcon.src = iconUrl;
    }
  }

  setBombs(n) {
    if (n === this._lastLives) return;
    this._lastLives = n;
    this.lives.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const img = document.createElement('img');
      img.src = '/assets/sprites/pu_bomb.png';
      img.alt = 'bomba';
      this.lives.appendChild(img);
    }
  }

  setBoss(visible, frac, name) {
    if (visible) {
      this.bossBar.classList.remove('hidden');
      this.barBoss.style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
      if (name) this.bossName.textContent = name;
    } else {
      this.bossBar.classList.add('hidden');
    }
  }

  showBanner(text, duration = 2.2) {
    this.banner.textContent = text;
    this.banner.classList.remove('show');
    void this.banner.offsetWidth; // reflow para reiniciar animación
    this.banner.classList.add('show');
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => {
      this.banner.classList.remove('show');
    }, duration * 1000);
  }

  setCombo(combo, mult) {
    if (combo >= 4) {
      this.combo.classList.remove('hidden');
      this.comboValue.textContent = `×${mult}`;
      this.combo.dataset.combo = String(combo);
    } else {
      this.combo.classList.add('hidden');
    }
  }

  reset() {
    this.setHealth(1);
    this.setShield(1);
    this.setScore(0);
    this.setMultiplier(1);
    this.setWave(1);
    this.setBoss(false, 1);
    this.setCombo(0, 1);
    this.setBombs(0);
  }
}
