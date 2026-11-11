/* ============================================================
   ScoreSystem — puntuación, combos, multiplicador y récord
   ============================================================ */

import { loadRecord, saveRecord } from '../core/config.js';

const COMBO_WINDOW = 2.8;

export class ScoreSystem {
  constructor() {
    this.reset();
    this.record = loadRecord();
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.kills = 0;
    this.multiplierBoost = 1; // power-up x2
    this.boostTimer = 0;
    this.displayScore = 0;
  }

  get multiplier() {
    const base = Math.min(8, 1 + Math.floor(this.combo / 4));
    return base * this.multiplierBoost;
  }

  get hasBoost() {
    return this.boostTimer > 0;
  }

  addKill(basePoints) {
    this.combo += 1;
    this.comboTimer = COMBO_WINDOW;
    this.kills += 1;
    const mult = this.multiplier;
    const gained = Math.round(basePoints * mult);
    this.score += gained;
    return { gained, mult };
  }

  addScore(v) {
    this.score += Math.round(v * this.multiplierBoost);
  }

  activateBoost(seconds = 12) {
    this.multiplierBoost = 2;
    this.boostTimer = seconds;
  }

  /* perder combo al recibir daño */
  breakCombo() {
    this.combo = 0;
    this.comboTimer = 0;
  }

  update(dt) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.boostTimer > 0) {
      this.boostTimer -= dt;
      if (this.boostTimer <= 0) this.multiplierBoost = 1;
    }
    // el marcador "cae" hacia el valor real para efecto visual
    const diff = this.score - this.displayScore;
    if (Math.abs(diff) < 2) this.displayScore = this.score;
    else this.displayScore += diff * Math.min(1, dt * 9);
  }

  checkRecord() {
    if (this.score > this.record) {
      this.record = this.score;
      saveRecord(this.record);
      return true;
    }
    return false;
  }
}
