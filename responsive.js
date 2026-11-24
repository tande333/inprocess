/* Responsive presentation only: existing callbacks, records and permissions are reused. */
(() => {
  let frame = 0;
  let navSignature = '';
  const narrow = window.matchMedia('(max-width: 1100px)');
  const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function refreshNavigation() {
    if (typeof menus === 'undefined' || typeof currentUser === 'undefined' || !currentUser) return;
    const available = menus.filter(m => m.menuType === 'MENU');
    const signature = JSON.stringify([available.map(m=>[m.menuCode,m.menuName]),currentMenuCode,currentUser.roles]);
    if (signature === navSignature) return;
    navSignature = signature;
    let nav = document.getElementById('mobileNavigation');
    if (!nav) { nav = document.createElement('nav'); nav.id='mobileNavigation'; nav.className='mobile-navigation'; nav.setAttribute('aria-label','手机导航'); document.body.append(nav); }
    const choices = [['home','首页','⌂'],['project:list','PO','▤'],['resource:root','资源','♙'],['report:root','报表','▥']].filter(([code])=>code==='home'||(code==='resource:root'?available.some(m=>['stats:personnel','resource:leave'].includes(m.menuCode)):code==='report:root'?available.some(m=>['workload:report','report:project','report:personnel'].includes(m.menuCode)):available.some(m=>m.menuCode===code)));
    const bottomCodes=new Set(choices.map(([code])=>code));
    if(bottomCodes.has('report:root')){bottomCodes.add('workload:report');bottomCodes.add('report:project');bottomCodes.add('report:personnel');}
    if(bottomCodes.has('resource:root')){bottomCodes.add('stats:personnel');bottomCodes.add('resource:leave');}
    let resourceDialog=document.getElementById('mobileResourceDialog');if(!resourceDialog){resourceDialog=document.createElement('dialog');resourceDialog.id='mobileResourceDialog';resourceDialog.className='mobile-menu';document.body.append(resourceDialog);}
    resourceDialog.innerHTML='<div class="mobile-menu-heading"><strong>资源管理</strong><button type="button" data-resource-close>关闭</button></div><div class="mobile-menu-items">'+available.filter(m=>['stats:personnel','resource:leave'].includes(m.menuCode)).map(m=>`<button type="button" data-mobile-menu="${safe(m.menuCode)}">${safe(m.menuName)}</button>`).join('')+'</div>';
    const moreMenus=available.filter(menu=>menu.menuCode!=='ops:bugs' && !bottomCodes.has(menu.menuCode));
    let reportDialog=document.getElementById('mobileReportDialog');
    if(!reportDialog){reportDialog=document.createElement('dialog');reportDialog.id='mobileReportDialog';reportDialog.className='mobile-menu';reportDialog.setAttribute('aria-label','报表');document.body.append(reportDialog);}
    reportDialog.innerHTML='<div class="mobile-menu-heading"><strong>报表</strong><button type="button" data-report-close>关闭</button></div><div class="mobile-menu-items">'+available.filter(m=>['workload:report','report:project','report:personnel'].includes(m.menuCode)).map(m=>`<button type="button" data-mobile-menu="${safe(m.menuCode)}">${safe(m.menuName)}</button>`).join('')+'</div>';
    nav.innerHTML=choices.map(([code,label,symbol])=>`<button type="button" data-mobile-menu="${safe(code)}" class="${(currentMenuCode===code||(code==='resource:root'&&['stats:personnel','resource:leave'].includes(currentMenuCode))||(code==='report:root'&&['workload:report','report:project','report:personnel'].includes(currentMenuCode)))?'active':''}" ${(currentMenuCode===code||(code==='resource:root'&&['stats:personnel','resource:leave'].includes(currentMenuCode))||(code==='report:root'&&['workload:report','report:project','report:personnel'].includes(currentMenuCode)))?'aria-current="page"':''}><span class="mobile-nav-symbol" aria-hidden="true">${symbol}</span>${label}</button>`).join('')+'<button type="button" data-mobile-more><span class="mobile-nav-symbol" aria-hidden="true">☰</span>更多</button>';
    let dialog=document.getElementById('mobileMenuDialog');
    if(!dialog){dialog=document.createElement('dialog');dialog.id='mobileMenuDialog';dialog.className='mobile-menu';dialog.setAttribute('aria-label','更多功能');document.body.append(dialog);}
    dialog.innerHTML='<div class="mobile-menu-heading"><strong>更多功能</strong><button type="button" data-mobile-close aria-label="关闭菜单">关闭</button></div><div class="mobile-menu-items">'+(moreMenus.map(m=>`<button type="button" data-mobile-menu="${safe(m.menuCode)}">${safe(m.menuName)}</button>`).join('') || '<div class="empty">暂无其他菜单</div>')+'</div>';
  }
  function prepareTables() {
    document.querySelectorAll('main table, #formBody table').forEach(table=>{
      if(table.closest('.project-table-layout,.generic-fixed-action,.desktop-only'))return;
      const rows=table.tHead?.rows;
      if(!rows||rows.length!==1||Array.from(rows[0].cells).some(c=>c.colSpan!==1||c.rowSpan!==1))return;
      const labels=Array.from(rows[0].cells).map(c=>c.textContent.trim());
      if(labels.length<2)return;
      table.classList.add('responsive-cards');
      Array.from(table.tBodies).forEach(body=>Array.from(body.rows).forEach(row=>Array.from(row.cells).forEach((cell,i)=>{
        const label=labels[i]||'';
        if(cell.dataset.mobileLabel!==label)cell.dataset.mobileLabel=label;
      })));
    });
  }
  function prepareForms() {
    document.querySelectorAll('#formBody .form-section, #statsPage .stats-grid > .form-section').forEach(section=>{
      const title=Array.from(section.children).find(el=>el.classList.contains('form-section-title'));
      if(!title||title.querySelector('.mobile-section-toggle'))return;
      const isStats=!!section.closest('#statsPage');
      const expandedLabel=isStats?'折叠':'收起';
      if(isStats) section.classList.add('mobile-section-collapsed');
      const toggle=document.createElement('button');toggle.type='button';toggle.className='mobile-section-toggle';toggle.textContent=isStats?'展开':expandedLabel;toggle.setAttribute('aria-expanded',String(!isStats));
      const content=Array.from(section.children).find(el=>el!==title && el.id);
      if(content) toggle.setAttribute('aria-controls',content.id);
      toggle.addEventListener('click',()=>{const collapsed=section.classList.toggle('mobile-section-collapsed');toggle.textContent=collapsed?'展开':expandedLabel;toggle.setAttribute('aria-expanded',String(!collapsed));});title.append(toggle);
    });
    const reason=document.getElementById('leaderReviewView');
    if(reason?.hasAttribute('ondblclick')&&!reason.parentElement.querySelector('.mobile-edit-reason')){
      const button=document.createElement('button');button.type='button';button.className='mobile-edit-reason';button.textContent='编辑原因';button.addEventListener('click',()=>showLeaderReviewEditor());reason.before(button);
    }
    document.querySelectorAll('#formBody td.editable-cell[ondblclick]').forEach(cell=>{
      if(cell.querySelector('[data-mobile-cell-edit],input'))return;
      const button=document.createElement('button');button.type='button';button.className='mobile-only';button.dataset.mobileCellEdit='';button.textContent='编辑';button.addEventListener('click',()=>{button.remove();cell.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));});cell.append(button);
    });
  }
  function prepareFilters() {
    document.querySelectorAll('main .toolbar').forEach(toolbar=>{
      if(toolbar.querySelector('.mobile-filter-toggle'))return;
      const fields=Array.from(toolbar.children).filter(c=>!c.classList.contains('toolbar-actions')&&!c.matches('input[type=search]'));
      if(fields.length<3)return;
      const button=document.createElement('button');button.type='button';button.className='mobile-filter-toggle mobile-only';button.textContent='收起筛选条件';button.setAttribute('aria-expanded','true');
      button.addEventListener('click',()=>{const closed=toolbar.classList.toggle('mobile-filters-closed');button.textContent=closed?'展开筛选条件':'收起筛选条件';button.setAttribute('aria-expanded',String(!closed));});toolbar.prepend(button);
    });
  }
  const observedLists = new Set();
  const listObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const target = entry.target;
      if (!entry.isIntersecting || !narrow.matches || target.dataset.more !== 'true') return;
      const state = mobileListLoads[target.dataset.mobileList];
      if (mobileListAppending || state?.busy || state?.error) return;
      loadNextMobileRows(target.dataset.mobileList).catch(error => showMessage(error.message));
    });
  }, {rootMargin: '0px 0px 100px 0px'});
  function prepareInfiniteLists() {
    observedLists.forEach(el => { if (!el.isConnected) { listObserver.unobserve(el); observedLists.delete(el); } });
    document.querySelectorAll('[data-mobile-list]').forEach(el => {
      const state = mobileListLoads[el.dataset.mobileList];
      const text = state?.busy ? '正在加载…' : state?.error ? '加载失败，已加载的内容已保留' : el.dataset.more === 'true' ? '继续向下滑动，加载更多' : '已全部加载';
      const label = el.querySelector('span');
      if (label.textContent !== text) label.textContent = text;
      el.setAttribute('aria-busy', String(!!state?.busy));
      el.querySelector('button').hidden = !state?.error;
      if (!observedLists.has(el)) { observedLists.add(el); listObserver.observe(el); }
    });
  }
  let keyboardSaving=false;
  let compositionEndedAt=0;
  const editableInput=input=>input instanceof HTMLInputElement && !input.readOnly && !input.disabled && !['hidden','button','submit','checkbox','radio','file','range','color'].includes(input.type);
  const searchOrPicker=input=>input.closest('[data-enter-search],.multi-person,.project-application-select,.multi-select-panel') || input.type==='search';
  function prepareMobileSubmit(){
    document.querySelectorAll('#formBody input').forEach(input=>{
      const eligible=narrow.matches && editableInput(input) && !searchOrPicker(input);
      if(eligible && !input.hasAttribute('enterkeyhint')){input.setAttribute('enterkeyhint','done');input.dataset.mobileEnterHint='1';}
      else if(!eligible && input.dataset.mobileEnterHint){input.removeAttribute('enterkeyhint');delete input.dataset.mobileEnterHint;}
    });
  }
  document.addEventListener('compositionend',()=>{compositionEndedAt=Date.now();},true);
  document.addEventListener('keydown',async event=>{
    const input=event.target;
    if(!narrow.matches || event.key!=='Enter' || !editableInput(input) || !input.closest('#formBody'))return;
    // Picking a person/application and searching retain their existing Enter action.
    if(searchOrPicker(input))return;
    if(event.isComposing || event.keyCode===229 || Date.now()-compositionEndedAt<150){event.stopImmediatePropagation();return;}
    if(event.ctrlKey || event.altKey || event.metaKey || event.shiftKey)return;
    let save=null;
    if(input.hasAttribute('data-workload-detail-inline-field')){
      const row=input.closest('[data-workload-detail-row]');
      if(row)save=()=>finishWorkloadDetailRowEdit(Number(row.dataset.workloadDetailRow));
    }else if(input.matches('.project-info-editor'))save=()=>saveProjectAddressInfoEdit();
    else if(input.matches('.inline-cell-editor'))save=()=>input.blur();
    else if(input.hasAttribute('data-workload-detail-field')){
      const button=document.querySelector('#formBody .modal-inline-actions button[onclick^="saveWorkloadDetail("]');
      const match=button?.getAttribute('onclick').match(/saveWorkloadDetail\((\d+)\)/);
      if(match)save=()=>saveWorkloadDetail(Number(match[1]));
    }else if(['project','generic','changePassword','golive','roleMenus'].includes(activeModal)){
      const button=document.querySelector('.modal-footer button[onclick="handleModalSave()"]');
      if(button && !button.disabled && button.getClientRects().length)save=()=>handleModalSave();
    }
    if(!save)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(event.repeat || keyboardSaving)return;
    keyboardSaving=true;
    try{await save();}catch(error){showMessage(error.message || '保存失败');}finally{keyboardSaving=false;}
  },true);
  function refresh(){frame=0;refreshNavigation();prepareTables();prepareForms();prepareFilters();prepareInfiniteLists();prepareMobileSubmit();}
  function schedule(){if(!frame)frame=requestAnimationFrame(refresh);}
  window.refreshResponsiveUi=schedule;
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.closest('[data-mobile-list]')) { const key=button.closest('[data-mobile-list]').dataset.mobileList; if(mobileListLoads[key]) mobileListLoads[key].error=false; loadNextMobileRows(key).catch(error=>showMessage(error.message)); }
    if(button.hasAttribute('data-mobile-more'))document.getElementById('mobileMenuDialog').showModal();
    if(button.hasAttribute('data-mobile-close'))document.getElementById('mobileMenuDialog').close();
    if(button.hasAttribute('data-report-close'))document.getElementById('mobileReportDialog')?.close();
    if(button.hasAttribute('data-resource-close'))document.getElementById('mobileResourceDialog')?.close();
    if(button.dataset.mobileMenu==='resource:root'){document.getElementById('mobileResourceDialog').showModal();return;}
    if(button.dataset.mobileMenu)document.getElementById('mobileResourceDialog')?.close();
    if(button.dataset.mobileMenu==='report:root'){document.getElementById('mobileReportDialog').showModal();return;}
    if(button.dataset.mobileMenu){document.getElementById('mobileReportDialog')?.close();document.getElementById('mobileMenuDialog')?.close();handleTopMenuClick(button.dataset.mobileMenu).then(()=>{if(button.dataset.mobileMenu!=='ops:bugs')window.scrollTo({top:0,behavior:'auto'});schedule();}).catch(error=>showMessage(error.message));}
  });
  document.addEventListener('invalid',event=>{event.target.closest('.mobile-section-collapsed')?.classList.remove('mobile-section-collapsed');},true);
  narrow.addEventListener('change',()=>{document.querySelectorAll('.multi-person[data-role] .person-filter-input').forEach(input=>refreshPersonOptions(input));if(!narrow.matches){document.getElementById('mobileResourceDialog')?.close();document.getElementById('mobileMenuDialog')?.close();document.getElementById('mobileReportDialog')?.close();}resetMobileListLayout().catch(error=>showMessage(error.message));schedule();});
  const appHeader=document.querySelector('.app-header');
  if(appHeader){
    const updateHeaderHeight=()=>document.documentElement.style.setProperty('--mobile-header-height',appHeader.getBoundingClientRect().height+'px');
    new ResizeObserver(updateHeaderHeight).observe(appHeader);
    updateHeaderHeight();
  }
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  refresh();
})();
