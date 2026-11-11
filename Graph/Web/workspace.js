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
  document.getElementById('reportOptionsToggle').addEventListener('click',e=>{
    const open=document.getElementById('reportDlg').classList.toggle('report-options-open');
    e.currentTarget.setAttribute('aria-expanded',String(open));e.currentTarget.textContent=open?'レポートの設定を閉じる':'レポートの設定を開く';
  });
  document.getElementById('graphEmptyLoad').addEventListener('click', () => document.getElementById('btnData').click());
  document.getElementById('graphSettings').open = innerWidth > 700;
  const updateFilters = () => {
    const s = window.LDR.store.state;
    const active = (s.listFilter?.size || 0) + (s.kindFilter?.size || 0);
    document.getElementById('filterActive').textContent = active ? `${active}件適用中` : '';
  };
  window.LDR.store.subscribe(updateFilters);
  const menu=document.createElement('details');menu.id='workspaceMenu';
  menu.innerHTML='<summary aria-label="履歴・ピン・ヘルプ"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></summary><div class="workspace-menu-content"></div>';
  const content=menu.querySelector('div');
  for(const id of ['dHist','dPin','dHelp'])content.append(document.getElementById(id));
  document.getElementById('btnData').after(menu);
  const menuMedia=matchMedia('(max-width:700px)');
  const syncMenu=()=>{
    menu.open=false;
    for(const id of ['dHist','dPin','dHelp']){
      const el=document.getElementById(id);
      if(menuMedia.matches)content.append(el);else document.getElementById('btnSideR').before(el);
    }
  };syncMenu();menuMedia.addEventListener('change',syncMenu);
  document.addEventListener('click',e=>{if(menuMedia.matches&&!menu.contains(e.target))menu.open=false;});
  const header = document.querySelector('#app > header');
  new ResizeObserver(() => document.documentElement.style.setProperty('--header-height', header.getBoundingClientRect().height + 'px')).observe(header);
  document.querySelector('#dHelp > summary')?.setAttribute('aria-label','凡例と操作方法');
})();
