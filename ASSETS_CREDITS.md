# NEBULA STRIKE — LAST DEFENDER · Créditos y licencias de assets

Todos los assets de este proyecto se **descargaron localmente** en la fase de
investigación (no hay hotlinks externos). Cada archivo se comprobó
descargándolo e inspeccionándolo antes de usarlo, y su licencia se verificó en
la página de origen.

Directorio del proyecto: `public/assets/`

---

## 1. Sprites y arte 2D

### Space Shooter Redux — *Kenney*
- **Página:** https://opengameart.org/content/space-shooter-redux
- **Licencia:** **CC0 1.0** (dominio público, sin atribución obligatoria)
- **Autor:** Kenney — https://kenney.nl
- **Archivos usados:**
  - Naves del jugador: `sprites/player.png`, `player_alt.png`, `player_strafe.png`
  - Estados de daño: `sprites/player_damage1.png` … `player_damage3.png`
  - Enemigos: `enemies/scout.png`, `interceptor.png`, `heavy.png`, `kamikaze.png`,
    `elite.png`, `ufo.png`, `scout_alt.png`, `heavy_alt.png`
  - Láseres: `sprites/laser_player.png`, `laser_enemy.png`, `laser_enemy2.png`,
    `laser_big.png`
  - Power-ups: `sprites/pu_health.png`, `pu_shield.png`, `pu_weapon.png`,
    `pu_speed.png`, `pu_bomb.png`, `pu_multiplier.png`
  - Efectos: `effects/shield1–3.png`, `effects/spark.png`, `effects/thruster/fire*.png`
  - Fondos: `backgrounds/base_dark.png`, `base_blue.png`
  - SFX: `audio/sfx/laser1.ogg`, `laser2.ogg`, `zap.ogg`, `shield_up.ogg`,
    `shield_down.ogg`, `lose.ogg`, `twotone.ogg`
  - Tipografías: `ui/kenvector_future.ttf`, `ui/kenvector_future_thin.ttf`

### Space Shooter Art — *Kenney*
- **Página:** https://opengameart.org/content/space-shooter-art
- **Licencia:** **CC0 1.0**
- **Autor:** Kenney — https://kenney.nl
- **Archivos usados:**
  - `backgrounds/nebula.png`, `starfield.png`, `star_small.png`, `star_big.png`,
    `speedline.png`, `bg_color.png`
  - `enemies/ufo2.png`, `meteor_big.png`, `meteor_small.png`
  - `effects/shield_bubble.png`, `sprites/laser_enemy_big.png`

### Free 2D Explosion Animations (frame by frame) — *Sinestesia*
- **Página:** https://opengameart.org/content/2d-explosion-animations-frame-by-frame
- **Licencia:** **CC0 1.0**
- **Autor:** Sinestesia
- **Archivos usados:** hojas de animación 8×8
  (`effects/explosion_sheets/blast_small.png`, `blast_big.png`, `blast_fire.png`)
  → explosiones del juego completo (jugador, enemigos, jefe).

### Simple Space — *Kenney*
- **Página:** https://kenney.nl/assets/simple-space
- **Licencia:** **CC0 1.0**
- **Autor:** Kenney — https://kenney.nl
- **Archivos usados:** base del jefe `boss/station_a.png`, alas/torretas
  `boss/station_b.png`, `enemies/elite2.png`, `kamikaze2.png`,
  `meteor_kenney.png`, `backgrounds/kenney_star.png`.

### Planets — *Kenney*
- **Página:** https://kenney.nl/assets/planets
- **Licencia:** **CC0 1.0**
- **Autor:** Kenney — https://kenney.nl
- **Archivos usados:** `backgrounds/planets/planet00–09.png`
  (planetas del parallax de fondo).

---

## 2. Música

| Pista (en juego) | Archivo | Autor | Licencia | Origen |
|---|---|---|---|---|
| Menú principal | `audio/music/menu.ogg` | **yd** | **CC0 1.0** | https://opengameart.org/content/space-music-out-there |
| Combate / oleadas | `audio/music/combat.ogg` | **Ville Nousiainen (Xythe / mutkanto)** | **CC0 1.0** | https://opengameart.org/content/fast-fight-battle-music |
| Jefe final | `audio/music/boss.mp3` | **Matthew Pablo** | **CC-BY 3.0** ⚠️ | https://opengameart.org/content/space-boss-battle-theme |
| Ambiental (reserva) | `audio/music/ambient.mp3` | **CodeManu** | **CC0 1.0** | https://opengameart.org/content/magic-space |

> ⚠️ **Atribución obligatoria (CC-BY 3.0):** *"Orbital Colossus"* de
> **Matthew Pablo** (https://www.matthewpablo.com) se usa como música del jefe.
> Esta atribución queda cumplida en este archivo y en el pie del menú principal.

---

## 3. Efectos de sonido

### Sci-Fi Sounds — *Kenney*
- **Página:** https://kenney.nl/assets/sci-fi-sounds
- **Licencia:** **CC0 1.0**
- **Archivos usados:** `laser_player.ogg`, `laser_enemy.ogg`, `laser_beam.ogg`,
  `explosion_small.ogg`, `explosion_big.ogg`, `explosion_huge.ogg`,
  `hit_player.ogg`, `hit_enemy.ogg`, `shield_hit.ogg`, `thruster.ogg`,
  `boss_engine.ogg`, `boss_warning.ogg`.

### Interface Sounds — *Kenney*
- **Página:** https://kenney.nl/assets/interface-sounds
- **Licencia:** **CC0 1.0**
- **Archivos usados:** `ui_click.ogg`, `ui_back.ogg`, `ui_error.ogg`,
  `ui_start.ogg`, `powerup.ogg`.

---

## 4. Tipografías

- **KenVector Future / Future Thin** — Kenney (CC0, incluido en Space Shooter
  Redux): `ui/kenvector_future.ttf`, `ui/kenvector_future_thin.ttf`.

---

## 5. Código y dependencias

| Componente | Licencia |
|---|---|
| Three.js (npm `three`) | MIT |
| Vite (dev dependency) | MIT |
| puppeteer-core (solo tests) | Apache-2.0 |
| Resto del código del juego | Escrito para este proyecto |

---

## Resumen de obligaciones

- **CC0** (Kenney, Sinestesia, yd, Ville Nousiainen, CodeManu): uso libre,
  comercial y sin atribución obligatoria. Se acreditan igualmente por respeto
  a los autores.
- **CC-BY 3.0** (Matthew Pablo — música del jefe): **atribución obligatoria**,
  cumplida en este documento.
- No se usa ningún asset con CC-BY-SA, GPL ni otras copyleft.
- Ningún archivo apunta a una URL externa en tiempo de ejecución.
