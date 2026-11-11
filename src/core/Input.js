/* ============================================================
   Input — teclado + joystick virtual táctil
   ============================================================ */

export class Input {
  constructor() {
    this.keys = new Set();
    this._specialQueued = false;
    this._pauseQueued = false;
    this._weaponQueued = 0;
    this._fireHeld = false;

    // táctil
    this.touchMove = { x: 0, y: 0, active: false };
    this.touchFire = false;
    this.touchSpecial = false;
    this.isTouchDevice = false;

    this._bindKeyboard();
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.repeat) return;
      this.keys.add(e.code);

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyF') {
        this._specialQueued = true;
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        this._pauseQueued = true;
      }
      if (e.code === 'Digit1') this._weaponQueued = 1;
      if (e.code === 'Digit2') this._weaponQueued = 2;
      if (e.code === 'Digit3') this._weaponQueued = 3;
      if (e.code === 'Space') this._fireHeld = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'Space') this._fireHeld = false;
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this._fireHeld = false;
    });
  }

  /* ---- consultas ---- */
  getMove() {
    let x = 0;
    let y = 0;
    const k = this.keys;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;

    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }

    if (this.touchMove.active) {
      return { x: this.touchMove.x, y: this.touchMove.y };
    }
    return { x, y };
  }

  isFiring(autoFire) {
    return this._fireHeld || this.touchFire || autoFire;
  }

  consumeSpecial() {
    const v = this._specialQueued || this.touchSpecial;
    this._specialQueued = false;
    this.touchSpecial = false;
    return v;
  }

  consumePause() {
    const v = this._pauseQueued;
    this._pauseQueued = false;
    return v;
  }

  consumeWeaponKey() {
    const v = this._weaponQueued;
    this._weaponQueued = 0;
    return v;
  }

  clear() {
    this.keys.clear();
    this._fireHeld = false;
    this._specialQueued = false;
    this._pauseQueued = false;
    this._weaponQueued = 0;
    this.touchMove = { x: 0, y: 0, active: false };
    this.touchFire = false;
    this.touchSpecial = false;
  }

  /* ---- joystick virtual ---- */
  attachTouchControls(zone, base, knob, specialBtn) {
    let pointerId = null;
    let originX = 0;
    let originY = 0;
    const RADIUS = 58;

    const setKnob = (dx, dy) => {
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };

    const onDown = (e) => {
      if (pointerId !== null) return;
      this.isTouchDevice = true;
      pointerId = e.pointerId;
      zone.setPointerCapture(e.pointerId);
      const rect = base.parentElement.getBoundingClientRect();
      originX = e.clientX;
      originY = e.clientY;
      base.style.left = `${e.clientX - rect.left}px`;
      base.style.top = `${e.clientY - rect.top}px`;
      base.classList.add('active');
      this.touchMove.active = true;
      this.touchMove.x = 0;
      this.touchMove.y = 0;
      setKnob(0, 0);
    };

    const onMove = (e) => {
      if (e.pointerId !== pointerId) return;
      let dx = e.clientX - originX;
      let dy = e.clientY - originY;
      const dist = Math.hypot(dx, dy);
      if (dist > RADIUS) {
        dx = (dx / dist) * RADIUS;
        dy = (dy / dist) * RADIUS;
      }
      setKnob(dx, dy);
      // arriba = positivo en nuestro mundo
      const nx = dx / RADIUS;
      const ny = -dy / RADIUS;
      const dead = 0.16;
      this.touchMove.x = Math.abs(nx) < dead ? 0 : nx;
      this.touchMove.y = Math.abs(ny) < dead ? 0 : ny;
    };

    const onUp = (e) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      base.classList.remove('active');
      setKnob(0, 0);
      this.touchMove.active = false;
      this.touchMove.x = 0;
      this.touchMove.y = 0;
    };

    zone.addEventListener('pointerdown', onDown);
    zone.addEventListener('pointermove', onMove);
    zone.addEventListener('pointerup', onUp);
    zone.addEventListener('pointercancel', onUp);

    specialBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.touchSpecial = true;
      specialBtn.classList.add('cooling');
      setTimeout(() => specialBtn.classList.remove('cooling'), 350);
    });

    // disparo táctil: tocar la mitad derecha dispara
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      if (e.target.closest('#joystick-zone') || e.target.closest('.touch-btn') || e.target.closest('.screen')) return;
      this.touchFire = true;
    });
    window.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'touch') return;
      this.touchFire = false;
    });
  }
}
