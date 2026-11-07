// StPageFlip's own mouse/touch listeners are disabled. Only mouse pointers reach it.
export function attachMouse(surface, flip, enabled = () => true) {
  let start = null, dragged = false;
  const point = e => { const r = surface.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const down = e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !enabled() || e.target.closest('button,a,input')) return;
    const p = point(e), rect = flip.getBoundsRect();
    if (p.x < rect.left || p.x > rect.left + rect.width || p.y < rect.top || p.y > rect.top + rect.height) return;
    start = { ...p, id: e.pointerId }; dragged = false;
    surface.setPointerCapture(e.pointerId);
    flip.startUserTouch(p);
    e.preventDefault();
  };
  const move = e => {
    if (e.pointerType !== 'mouse' || !enabled()) return;
    const p = point(e);
    if (start) { dragged ||= Math.hypot(p.x - start.x, p.y - start.y) > 5; flip.userMove(p, false); }
    else flip.userMove(p, false);
  };
  const up = e => {
    if (e.pointerType !== 'mouse' || !start) return;
    const p = point(e); start = null;
    // isSwipe=false lets StPageFlip complete a corner drag or a mouse click.
    flip.userStop(p, false);
    if (surface.hasPointerCapture(e.pointerId)) surface.releasePointerCapture(e.pointerId);
  };
  const cancel = () => {
    if (!start) return;
    if (dragged) flip.userMove(start, false);
    flip.userStop(start, !dragged); start = null;
  };
  const leave = e => { if (e.pointerType === 'mouse' && !start) flip.userMove({ x: -1000, y: -1000 }, false); };
  const handlers = { pointerdown: down, pointermove: move, pointerup: up, pointercancel: cancel, pointerleave: leave };
  for (const [type, fn] of Object.entries(handlers)) surface.addEventListener(type, fn);
  return () => { cancel(); for (const [type, fn] of Object.entries(handlers)) surface.removeEventListener(type, fn); };
}
