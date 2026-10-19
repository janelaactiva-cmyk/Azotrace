(() => {
  const script = document.currentScript;
  if (!script) return;
  const origin = new URL(script.src).origin;
  document.querySelectorAll('[data-azotrace-plans]').forEach(container => {
    if (container.dataset.azotraceMounted) return;
    container.dataset.azotraceMounted = 'true';
    const frame = document.createElement('iframe');
    frame.src = origin + '/planos/embed';
    frame.title = 'Planos Azotrace';
    frame.style.cssText = 'display:block;width:100%;height:1050px;border:0;';
    frame.loading = 'lazy';
    container.appendChild(frame);
    window.addEventListener('message', event => {
      if (event.origin !== origin || event.source !== frame.contentWindow || event.data?.type !== 'azotrace-plans-height') return;
      const height = Number(event.data.height);
      if (Number.isFinite(height) && height > 0 && height < 15000) frame.style.height = Math.ceil(height) + 'px';
    });
  });
})();
