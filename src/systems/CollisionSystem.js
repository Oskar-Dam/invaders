/* ============================================================
   CollisionSystem — detección circular + utilidades
   ============================================================ */

export function circleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy <= r * r;
}

export function pointInRect(px, py, cx, cy, halfW, halfH) {
  return Math.abs(px - cx) <= halfW && Math.abs(py - cy) <= halfH;
}

/* rectángulo (bala de radio r) contra círculo */
export function rectCircleHit(bx, by, br, cx, cy, cr) {
  const dx = Math.max(Math.abs(bx - cx) - br, 0);
  const dy = Math.max(Math.abs(by - cy) - br, 0);
  return dx * dx + dy * dy <= cr * cr;
}
