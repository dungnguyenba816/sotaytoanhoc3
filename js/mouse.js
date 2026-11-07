// StPageFlip's own mouse/touch listeners are disabled. Only mouse pointers reach it.
export function isBookCorner(point, bounds, orientation = 'landscape') {
  const pageWidth = bounds.pageWidth ?? bounds.width / 2;
  const left = bounds.left + (orientation === 'portrait' ? pageWidth : 0);
  const right = bounds.left + bounds.width;
  const bottom = bounds.top + bounds.height;
  const size = Math.min(32, pageWidth * .12, bounds.height * .12);
  return point.x >= left && point.x <= right && point.y >= bounds.top && point.y <= bottom
    && (point.x <= left + size || point.x >= right - size)
    && (point.y <= bounds.top + size || point.y >= bottom - size);
}

function verticalScroller(element) {
  // In Streamlit the document is inside an auto-sized iframe. Continue through
  // its same-origin frame to find the actual scrollable parent page.
  while (element?.ownerDocument) {
    const doc = element.ownerDocument, root = doc.scrollingElement;
    for (let node = element; node && node !== root; node = node.parentElement) {
      if (node.scrollHeight > node.clientHeight + 1 && /auto|scroll/.test(doc.defaultView.getComputedStyle(node).overflowY)) return node;
    }
    if (root && root.scrollHeight > root.clientHeight + 1) return root;
    try { element = doc.defaultView.frameElement; } catch { return null; }
  }
  return null;
}

function scrollImmediately(element, axis, value) {
  if (element.scrollTo) element.scrollTo({ [axis]: value, behavior: 'instant' });
  else element[axis === 'left' ? 'scrollLeft' : 'scrollTop'] = value;
}

export function attachMouse(surface, flip, enabled = () => true, { viewport = null, canPan = () => true } = {}) {
  let gesture = null, hovering = false;
  const point = e => { const rect = surface.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top }; };
  const corner = p => isBookCorner(p, flip.getBoundsRect(), flip.getOrientation?.() || 'landscape');
  const clearHover = () => {
    surface.classList.remove('is-flip-corner');
    if (hovering) { hovering = false; flip.userMove({ x: -1000, y: -1000 }, false); }
  };
  const release = () => {
    const id = gesture?.id; gesture = null;
    surface.classList.remove('is-panning');
    if (id !== undefined && surface.hasPointerCapture(id)) surface.releasePointerCapture(id);
  };
  const down = e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || gesture || !enabled() || e.target.closest('button,a,input,select,textarea,[contenteditable]')) return;
    const p = point(e), bounds = flip.getBoundsRect();
    const left = bounds.left + (flip.getOrientation?.() === 'portrait' ? bounds.pageWidth : 0);
    if (p.x < left || p.x > bounds.left + bounds.width || p.y < bounds.top || p.y > bounds.top + bounds.height) return;
    if (corner(p)) {
      gesture = { mode: 'flip', start: p, id: e.pointerId, dragged: false };
      flip.startUserTouch(p);
    } else {
      clearHover();
      const movable = Boolean(viewport && canPan());
      const vertical = movable ? verticalScroller(viewport) : null;
      // Screen coordinates stay fixed when scrolling the parent moves this iframe.
      gesture = { mode: 'pan', movable, x: e.screenX ?? e.clientX, y: e.screenY ?? e.clientY, left: viewport?.scrollLeft || 0, top: vertical?.scrollTop || 0, vertical, id: e.pointerId };
      if (movable) surface.classList.add('is-panning');
    }
    surface.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const move = e => {
    if (e.pointerType !== 'mouse') return;
    if (gesture && e.pointerId !== gesture.id) return;
    if (gesture?.mode === 'pan') {
      if (gesture.movable) scrollImmediately(viewport, 'left', gesture.left + gesture.x - (e.screenX ?? e.clientX));
      if (gesture.vertical) scrollImmediately(gesture.vertical, 'top', gesture.top + gesture.y - (e.screenY ?? e.clientY));
      e.preventDefault(); return;
    }
    if (!enabled()) return;
    const p = point(e);
    if (gesture?.mode === 'flip') {
      gesture.dragged ||= Math.hypot(p.x - gesture.start.x, p.y - gesture.start.y) > 5;
      flip.userMove(p, false);
    } else if (!e.buttons && corner(p)) {
      hovering = true; surface.classList.add('is-flip-corner'); flip.userMove(p, false);
    } else clearHover();
  };
  const up = e => {
    if (e.pointerType !== 'mouse' || !gesture || e.pointerId !== gesture.id) return;
    if (gesture.mode === 'flip') flip.userStop(point(e), false);
    release();
  };
  const cancel = event => {
    if (event && gesture && event.pointerId !== gesture.id) return;
    if (gesture?.mode === 'flip') {
      if (gesture.dragged) flip.userMove(gesture.start, false);
      flip.userStop(gesture.start, !gesture.dragged);
    }
    release(); clearHover();
  };
  const leave = e => { if (e.pointerType === 'mouse' && !gesture) clearHover(); };
  const lostCapture = event => { if (gesture) cancel(event); };
  const handlers = { pointerdown: down, pointermove: move, pointerup: up, pointercancel: cancel, pointerleave: leave, lostpointercapture: lostCapture };
  for (const [type, fn] of Object.entries(handlers)) surface.addEventListener(type, fn);
  return () => { cancel(); for (const [type, fn] of Object.entries(handlers)) surface.removeEventListener(type, fn); };
}
