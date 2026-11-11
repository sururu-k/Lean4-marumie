/* Shared line icons and accessible names for static controls. */
(() => {
  const paths = {
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
    theme: '<path d="M20 13A8 8 0 0 1 11 4a8 8 0 1 0 9 9Z"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    back: '<path d="m12 5-7 7 7 7M5 12h14"/>',
    forward: '<path d="m12 5 7 7-7 7M19 12H5"/>',
    minus: '<path d="M5 12h14"/>', plus: '<path d="M5 12h14M12 5v14"/>'
  };
  const controls = {btnSide:'menu',btnSideR:'panel',themeBtn:'theme',dataClose:'close',reportDlgClose:'close',btnBack:'back',btnFwd:'forward',btnZoomOut:'minus',btnZoomIn:'plus'};
  for (const [id, name] of Object.entries(controls)) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  }
  const header = document.querySelector('#app > header');
  new ResizeObserver(() => document.documentElement.style.setProperty('--header-height', header.getBoundingClientRect().height + 'px')).observe(header);
  document.querySelector('#dHelp > summary')?.setAttribute('aria-label','凡例と操作方法');
})();
