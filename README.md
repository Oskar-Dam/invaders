# NEBULA STRIKE — LAST DEFENDER

Shoot 'em up vertical arcade 2D para navegador, construido con **HTML5 + CSS3 +
JavaScript vanilla (ES Modules)** y **Three.js** (cámara ortográfica para
rendering 2D). Resolución de diseño **Full HD 1920×1080** con letterbox en
escritorio y adaptación táctil en móvil.

> Último defensor de la estación Coloso. Seis oleadas de enemigos, un jefe
> multiphase, tres armas, seis power-ups, combo scoring, screen shake,
> partículas, música y SFX con licencia verificada.

---

## Instalación y ejecución

Requisitos: **Node.js ≥ 18** (probado con Node 22) y npm.

```bash
npm install        # instala three (runtime) + vite (dev) + puppeteer-core (tests)
npm run dev        # servidor de desarrollo → http://localhost:5173
npm run build      # build de producción en ./dist
npm run preview    # sirve el build de producción
npm test           # pruebas de lógica pura (sin navegador)
```

El build genera un bundle estático con `base: './'`, por lo que `dist/` puede
servirse desde cualquier ruta (nginx, GitHub Pages, file:// con servidor…).

### Pruebas end-to-end (opcional)

Requiere el servidor de desarrollo corriendo (`npm run dev`) y Google Chrome en
`/usr/bin/google-chrome`:

```bash
npm run test:e2e    # partida completa: menú → combate → oleadas → jefe → victoria/derrota → récord
npm run test:boss    # jefe: fases 1→2→3, banners, telegraph + barrido láser + daño, HUD
npm run test:touch   # controles táctiles, joystick virtual y orientación móvil
npm run test:all     # todo lo anterior (incluye npm test)
```

También puede ejecutarse contra el build de producción:

```bash
npm run build && npm run preview
URL=http://localhost:4173/ npm run test:e2e
```

Las suites capturan pantallazos en `/tmp/opencode/shots/` y terminan con código
distinto de 0 si hay errores de consola o aserciones fallidas.

---

## Controles

| Tecla | Acción |
|---|---|
| `W A S D` / `← ↑ ↓ →` | Mover nave |
| `ESPACIO` | Disparar |
| `SHIFT` (o `F`) | Habilidad especial: **rayo de energía** (3 cargas, se regeneran). Si no hay cargas, usa una **Nova Bomb** si dispones de ella |
| `1` `2` `3` | Cambiar de arma (Pulse Laser / Triple Spread / Heavy Beam) |
| `ESC` / `P` | Pausar / reanudar |
| `ENTER` / `ESPACIO` | Empezar o reintentar desde los menús |

**Táctil (móvil/tablet):**
- Arrastra en la mitad izquierda para mover (**joystick virtual** aparece bajo el dedo).
- Toca la zona derecha para disparar — además hay **auto-disparo opcional** en Opciones.
- Botón **⚡** inferior derecho: habilidad especial (rayo de energía / Nova Bomb).
- Tamaños optimizados para pantallas táctil: botones 96×96px, joystick base 150×150px en teléfonos pequeños.
- En vertical se muestra el aviso «gira el dispositivo» (el juego sigue funcionando en cualquier orientación).
- En pantallas muy pequeñas (< 480px mínimo) el aviso es más breve y el juego escala sus elementos de UI.

**Opciones** (persisten en `localStorage`): volúmenes de música y efectos,
disparo automático, screen shake, densidad de partículas.

---

## Características

### Jugador
- Movimiento con aceleración/fricción, límites de pantalla.
- Casco 100 HP + escudo 50 (absorbe daño primero), 3 sprites de daño progresivo.
- Invulnerabilidad breve con parpadeo al recibir impacto.
- Motor con estela de partículas y glow.
- Especial: barrido de rayo vertical que daña enemigos, borra balas y hace daño
  continuo al jefe (se recarga con el tiempo, 3 cargas).

### 3 armas con 3 niveles cada una (9 configuraciones)
1. **Pulse Laser** — preciso, 1→2→3 haces.
2. **Triple Spread** — abanico 3→5→5 balas.
3. **Heavy Beam** — proyectiles pesados 2→4→4.
Se suben de nivel con power-ups `WEAPON+`; al máximo, sube el siguiente arma.

### 5 tipos de enemigos + 2 de apoyo (todos con IA propia)
| Tipo | Comportamiento |
|---|---|
| **Scout** | Desciende serpenteando y hace picado hacia el jugador |
| **Interceptor** | Entra, se mantiene en formación y dispara al jugador |
| **Heavy** | Tanque lento que se queda en su posición y dispara abanicos de 3 |
| **Kamikaze** | Persigue activamente y **explota al impactar** (parpadea de alerta) |
| **Elite** | Evade horizontalmente y dispara abanicos de 5 |
| UFO (apoyo) | Variante del interceptor |
| Meteoro (apoyo) | Rodando, sin disparo, daño por contacto |

### 6 oleadas con formaciones + jefe final
Oleadas en V, líneas, columnas y entradas laterales coordinadas; dificultad
progresiva (HP, velocidad y cadencia escalan por oleada). Banner de cada
oleada. Al terminar la 6, entra el jefe con música propia y aviso.

### Jefe: **COLOSSUS // STATION-9** — 3 fases
Compuesto por piezas reales (estación + alas/torretas de Kenney) con tintes,
motores y humo cuando está dañado.

- **Fase 1 (>66 %):** ráfagas apuntadas y abanicos.
- **Fase 2 (66–33 %):** espirales añadidas.
- **Fase 3 (<33 %):** espirales rápidas, misiles teledirigidos y
  **barrido láser horizontal** con telegraph parpadeante (aviso amarillo →
  rayo magenta).
- Secuencia de muerte: hit-stop, oleada de explosiones encadenadas, puntuación
  bonus y pantalla de **victoria**.

### 6 power-ups
`REPAIR` (+30 HP), `SHIELD` (+25), `WEAPON+`, `SPEED UP` (7 s),
`NOVA BOMB` (+1, mata todo en pantalla), `×2 SCORE` (12 s). Imán de recogida,
chips de glow, probabilidad mayor en enemigos pesados.

### Puntuación y récord
- Combo con ventana de tiempo → multiplicador hasta ×8; se rompe al recibir daño.
- Puntuación flotante `+100` sobre cada baja.
- **Récord persistente en `localStorage`** (`nebula_strike_record`) y aviso de
  «★ NUEVO RÉCORD ★».

### Presentación
- Parallax multicapa: estrellas pequeñas/grandes, nebulosas tintadas, planetas
  que entran en escena, speed lines, todo con velocidad y deriva propias.
- Explosiones con sprite sheets reales (64 frames), ondas expansivas,
  chispas, humo, screen shake configurable e hit-stop.
- HUD completo: barras de casco/escudo/especial, vidas-bomba, marcador con
  caída suave, multiplicador, oleada, arma activa y barra de jefe.
- Menús DOM animados: carga con barra de progreso, título, controles,
  opciones, pausa, game over y victoria.
- Tipografía KenVector (pixel art) con glow cian/magenta.

### Audio
- **Web Audio API** para SFX (22 sonidos decodificados, con variación de
  pitch/ganancia) y `<audio>` streaming para música con crossfade.
- 3 pistas conmutadas: menú → combate → jefe.
- Desbloqueo en el primer gesto (política de autoplay) y pausa automática al
  perder el foco.

---

## Arquitectura

```
index.html            UI en DOM (HUD, menús, controles táctiles)
src/
  main.js             punto de entrada
  core/
    config.js         resolución, paleta, estadísticas, armas, enemigos, jefe,
                      dificultad, ajustes y récord (localStorage)
    Game.js           bucle RAF con dt acotado, máquina de estados, wiring
    Renderer.js       WebGL + cámara ortográfica + screen shake
    AssetManager.js   precarga de texturas y buffers de audio con progreso
    Input.js          teclado + joystick virtual táctil
    textures.js       texturas procedurales (anillos, glows)
  entities/           Player, Enemy, Boss, Projectile (pools), PowerUp
  systems/            Background, Particle, FX, Audio, Score, Wave, Collision
  scenes/GameScene.js orquestación de la partida y colisiones
  ui/                 HUD y Menus (DOM)
  styles/main.css     toda la interfaz
public/assets/        sprites, fondos, audio, fuentes (todo local)
tests/                logic.test.mjs, e2e.mjs, e2e-touch.mjs
ASSETS_CREDITS.md     licencias y atribuciones verificadas
```

Decisiones clave: resolución de mundo fija a 1080 de alto (el ancho varía con
el aspecto → anchura extra en 16:9), pooling de todos los proyectiles y
partículas, colisiones circulares, `dt` acotado a 1/20 s para evitar
tirones al recuperar foco.

---

## Resultados de pruebas

Ejecutadas el 11/11/2026 con Chrome headless (escritorio 1920×1080 y móvil
844×390), contra el servidor de desarrollo **y** contra el build de producción
(`vite preview`):

| Prueba | Resultado |
|---|---|
| `npm test` — lógica pura | ✅ **14/14 superadas** (colisiones, combos, power-ups, progresión de oleadas, config de armas/enemigos/jefe) |
| `npm run test:e2e` (dev) | ✅ **0 errores** de consola/página; 1 aviso inofensivo (`ERR_ABORTED` al cambiar de pista de música) |
| `npm run test:e2e` (build producción) | ✅ **0 errores** — mismo flujo completo sobre `dist/` |
| — assets cargados | 70/70 (44 texturas, 22 SFX, 4 pistas); **0 faltantes** |
| — flujo menú → juego | estado `playing`, enemigos vivos, balas de ambos bandos, partículas activas |
| — audio | `ctxState: running`, pista `combat` sonando, 22 SFX decodificados |
| — pausa `ESC` | `paused` → reanuda |
| — power-up arma | nivel 1 → 2 al recogerlo |
| — oleadas 1→6 y jefe | 6 oleadas progresadas + spawn de COLOSSUS |
| — victoria | pantalla visible, puntuación y récord guardados |
| — game over | pantalla visible |
| — récord | persistido en `localStorage` |
| — reinicio sin recargar | `playing`, score 0, vida completa |
| — especial y bomba | rayo activo con −1 carga; bomba consumida si no hay cargas |
| `npm run test:boss` (2 pasadas) | ✅ **0 errores, 0 fallos de aserción** |
| — fases del jefe | 1 → 2 → 3 tras bajar de 66 %/33 % con **balas reales** |
| — banners de fase | `COLOSSUS · PHASE 2` y `PHASE 3` mostrados |
| — ataques fase 3 | `missiles`, `spiral_fast`, `aimed_burst`, `beam_sweep` observados |
| — barrido láser | telegraph → barrido → **daño 55 → 35 HP** con invulnerabilidad |
| — HUD/visuales | icono del arma cargado, nave base intacta y decal de daño superpuesto |
| `npm run test:touch` | ✅ **0 errores**: joystick mueve la nave, disparo táctil, botón ⚡, aviso de giro en vertical |
| FPS (3 s, **software rendering** SwiftShader) | 19–30 FPS a 1920×1080 (con 2 navegadores en paralelo); en GPU real se espera 60 (el bucle está limitado a 60 fps por `requestAnimationFrame`) |
| `npm run build` | ✅ build OK: 615.8 kB JS (gzip 155.4 kB), 10.5 kB CSS, 8.4 kB HTML |

### Correcciones encontradas y aplicadas durante las pruebas

1. **Decals de daño**: los sprites `player_damage1–3` de Space Shooter Redux son
   *fragmentos de superposición*, no naves dañadas; se usaban como textura
   sustituta y la nave desaparecía. Ahora son un sprite superpuesto.
2. **Banner de fase del jefe**: mostraba `PHASE 3` también en la transición
   1→2 (el cálculo asumía solo dos destinos). Ahora lee `boss.phase`.
3. **Icono del arma**: `<img src="">` + guardia por nombre dejaba el icono
   roto con el arma inicial. Ahora se asigna siempre que cambie la URL.
4. **Tunelización del barrido láser**: con `dt` acotado a 1/20 s el rayo avanza
   ~64 px/frame y podía saltarse a un jugador inmóvil. Colisión *swept*
   (barre el recorrido entre frames).

---

## Limitaciones conocidas

1. **Software rendering en las pruebas:** las suites corren con SwiftShader
   (CPU), obteniendo 19–30 FPS a 1920×1080; el juego está pensado para GPU
   real donde `requestAnimationFrame` lo mantiene a 60 FPS. El test de FPS no
   mide por tanto el rendimiento real.
2. **Sin multiplayer ni guardado de partida:** solo se persisten récord y
   ajustes; no hay continuación a mitad de partida.
3. **El auto-disparo es global:** no se puede configurar por arma ni tenerlo
   activo solo en táctil.
4. **Móvil vertical:** se muestra el aviso de giro en lugar de forzar una
   disposición vertical alternativa (el juego es 16:9).
5. **Browsers sin WebGL:** se muestra «WEBGL NOT AVAILABLE» en la pantalla de
   carga; no hay render de respaldo en canvas 2D.
6. **La oleada 6 no se repite:** la campaña tiene un final fijo (jefe →
   victoria); no hay modo infinito ni oleadas proceduralmente infinitas.
7. **Pausa y música:** al pausar la música se detiene, pero al reanudar
   continúa desde donde estaba (sin mezcla en vivo entre pistas).

---

## Mapa de criterios de aceptación

| # | Criterio | Evidencia |
|---|---|---|
| 1 | Jugable de principio a fin | `test:e2e`: menú → 6 oleadas → jefe → victoria y también game over |
| 2 | 5 tipos de enemigos con IA | scout, interceptor, heavy, kamikaze, elite (+ufo y meteoro); `npm test` los valida |
| 3 | Jefe multiphase | `test:boss`: fases 1→2→3 con ataques distintos por fase |
| 4 | 3 armas | Pulse Laser / Triple Spread / Heavy Beam, 3 niveles; cambio con `1 2 3` verificado |
| 5 | Power-ups | 6 tipos; recogida de `WEAPON+` verificada (nivel 1→2) |
| 6 | Sistema de oleadas | 6 oleadas con formaciones + jefe final, banners y dificultad creciente |
| 7 | Sprites reales (no primitivas) | sprites de Kenney/OpenGameArt descargados y verificados; `ASSETS_CREDITS.md` |
| 8 | Audio | 22 SFX Web Audio + 3 pistas conmutadas; comprobado en las suites |
| 9 | Reinicio sin recargar | `test:e2e`: retry → `playing`, score 0, vida completa |
| 10 | Récord persistente | `localStorage` verificado (15.200 en la última ejecución) |
| 11 | Responsive | 1920×1080, 844×390 y 390×844 probados; letterbox y aviso de giro |
| 12 | Controles completos | WASD/flechas, Espacio, Shift (especial/bomba), Esc (pausa), 1-3 |
| 13 | Táctil | joystick virtual, disparo táctil, botón ⚡ (suite `test:touch`) |
| 14 | Assets con licencia verificada | todos CC0 salvo la música del jefe (CC-BY 3.0 con atribución) |
| 15 | Sin errores críticos | 0 errores de consola/página en todas las suites, dev y producción |

---

## Licencia del proyecto

Código: escrito para este proyecto. Assets: ver
[`ASSETS_CREDITS.md`](./ASSETS_CREDITS.md) — todos CC0 salvo la música del
jefe (CC-BY 3.0, atribución a Matthew Pablo incluida).
