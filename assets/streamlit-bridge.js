// Only included by the Streamlit bundle; the standalone site stays unchanged.
(() => {
  const send = (type, data = {}) => window.parent.postMessage({ isStreamlitMessage: true, type, ...data }, '*');
  let previousHeight = 0, scheduled = false;
  function resize() {
    scheduled = false;
    const workspace = document.querySelector('.workspace');
    if (!workspace) return;
    // Measure content rather than iframe scrollHeight, which cannot shrink below
    // the previous frame height when navigating to a shorter view.
    const height = Math.max(400, Math.ceil(workspace.getBoundingClientRect().bottom + window.scrollY) + 2);
    if (height !== previousHeight) { previousHeight = height; send('streamlit:setFrameHeight', { height }); }
  }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(resize); } }
  send('streamlit:componentReady', { apiVersion: 1 });
  const observer = new ResizeObserver(schedule);
  observer.observe(document.querySelector('.workspace'));
  window.addEventListener('message', event => { if (event.source === window.parent && event.data?.type === 'streamlit:render') schedule(); });
  window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule);
  schedule();
})();
