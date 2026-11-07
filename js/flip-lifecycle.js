// StPageFlip 2.0.7 does not cancel its RAF loop on destroy, and with its input
// disabled its resize listener is not removed. Scope both to this reader instance.
export function flipLifecycle(load) {
  const nativeRAF = window.requestAnimationFrame, nativeAdd = window.addEventListener;
  const frames = new Set(), listeners = []; let alive = true;
  function scopedRAF(callback) {
    if (!alive) return 0;
    const id = nativeRAF.call(window, time => {
      frames.delete(id); if (!alive) return;
      const previous = window.requestAnimationFrame; window.requestAnimationFrame = scopedRAF;
      try { callback(time); } finally { window.requestAnimationFrame = previous; }
    });
    frames.add(id); return id;
  }
  window.requestAnimationFrame = scopedRAF;
  window.addEventListener = function(type, fn, options) {
    if (type === 'resize') listeners.push([type, fn, options]);
    return nativeAdd.call(this, type, fn, options);
  };
  try { load(); }
  finally { window.requestAnimationFrame = nativeRAF; window.addEventListener = nativeAdd; }
  return () => { alive = false; frames.forEach(id => cancelAnimationFrame(id)); listeners.forEach(args => window.removeEventListener(...args)); };
}

// cloneNode does not copy canvas pixels. Preserve PDF content during portrait curls.
export function preserveCanvasCopies(flip) {
  for (let index = 0; index < flip.getPageCount(); index++) {
    const page = flip.getPage(index), original = page.newTemporaryCopy;
    page.newTemporaryCopy = function() {
      const existing = this.getTemporaryCopy(), copy = original.call(this);
      if (!existing && copy && copy !== this) {
        const sources = this.getElement().querySelectorAll('canvas');
        copy.getElement().querySelectorAll('canvas').forEach((canvas, i) => {
          if (sources[i]?.width && sources[i]?.height) canvas.getContext('2d').drawImage(sources[i], 0, 0);
        });
      }
      return copy;
    };
  }
}
