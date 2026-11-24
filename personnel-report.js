(() => {
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const days=h=>(Number(h||0)/8).toLocaleString('zh-CN',{maximumFractionDigits:2});
 const date=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')?Date.parse(s+'T00:00:00Z'):NaN;
 const monthRange=()=>{const d=new Date(),y=d.getFullYear(),m=d.getMonth();const f=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');return [f(new Date(y,m,1)),f(new Date(y,m+1,0))];};
 let data=null,ticket=0,search='',role=[],layoutObserver=null;let [rangeStart,rangeEnd]=monthRange();
 const mobileView=matchMedia('(max-width:1100px)'),expandedPeople=new Set();let mobileFiltersOpen=false;
 mobileView.addEventListener('change',()=>{if(data&&document.getElementById('personnelReportPage')?.style.display!=='none')render();});
 function render(){layoutObserver?.disconnect();const el=document.getElementById('nrBody');if(!el||!data)return;
 const roles=[...new Set(data.people.flatMap(p=>(p.roles||'').split('、')).filter(Boolean))].sort();
 const people=data.people.filter(p=>(!role.length||(p.roles||'').split('、').some(r=>role.includes(r)))&&(!search||(p.name||'').includes(search)));
 const start=date(rangeStart),end=date(rangeEnd)+86400000,span=end-start;
 const months=[];if(span<=62*86400000){for(let t=start;t<end;t+=7*86400000)months.push({time:t,label:new Date(t).toISOString().slice(0,10)});}else{for(let d=new Date(start);d.getTime()<end;d.setUTCMonth(d.getUTCMonth()+1,1))months.push({time:d.getTime(),label:d.toISOString().slice(0,7)});}
 const width=Math.max(1000,months.length*110),pos=t=>(t-start)/span*100;
 const segments=x=>Array.isArray(x.segments)?x.segments:[{start:x.start,end:x.end,hours:x.hours}];
 const visible=x=>segments(x).filter(s=>Number.isFinite(date(s.start))&&Number.isFinite(date(s.end))&&date(s.start)<end&&date(s.end)>=start);
 const included=x=>visible(x).length||!Number.isFinite(date(x.start))||!Number.isFinite(date(x.end));
 const projectLane=(x,i,p)=>{
   const parts=visible(x),color=['#258e82','#397fb1','#9870b3','#a87b30'][i%4];
   const bars=parts.map(part=>{const a=Math.max(date(part.start),start),b=Math.min(date(part.end)+86400000,end);const info=p.name+' · '+x.name+'｜本段：'+part.start+' 至 '+part.end+'｜本段工作量：'+days(part.hours)+'天｜项目总工作量：'+days(x.hours)+'天';
     return '<button class="nr-bar" style="left:'+pos(a)+'%;width:'+((b-a)/span*100)+'%;--nr-color:'+color+'" data-nr-info="'+esc(info)+'" title="'+esc(info)+'" aria-label="'+esc(info)+'"><span>'+esc(x.name)+' · '+days(part.hours)+'天</span></button>';
   }).join('');
   return '<div class="nr-lane">'+(bars||'<button class="nr-undated" data-nr-info="'+esc(p.name+' · '+x.name+'｜日期待维护｜'+days(x.hours)+'天')+'">'+esc(x.name)+' · 日期待维护 · '+days(x.hours)+'天</button>')+'</div>';
 };
 const leaveBars=p=>(p.leaves||[]).filter(l=>date(l.start)<end&&date(l.end)>=start).map(l=>{const a=Math.max(start,date(l.start)),b=Math.min(end,date(l.end)+86400000),info=p.name+' · 休假｜'+l.start+' 至 '+l.end;return `<div class="nr-lane"><button class="nr-bar nr-leave-bar" style="left:${pos(a)}%;width:${(b-a)/span*100}%;--nr-color:#7d8792" data-nr-info="${esc(info)}" aria-label="${esc(info)}"><span>休假 ${l.start} 至 ${l.end}</span></button></div>`;}).join('');
 const utilization=p=>{
   const available=p.availableDays??data.workdays;
   const ready=!p.issue&&Number.isFinite(p.periodHours)&&Number.isFinite(data.workdays),valid=ready&&available>0;
   const value=valid?(p.periodHours/8/available*100).toLocaleString('zh-CN',{maximumFractionDigits:1})+'%':'—';
   const info='饱和度：'+value+'\n工作日(天)：'+(Number.isFinite(data.workdays)?data.workdays:'—')+(p.availableDays!==undefined?'\n休假工作日(天)：'+(p.leaveDays||0)+'\n可工作日(天)：'+available:'')+'\n实际天数(天)：'+(ready?days(p.periodHours):'—');
   return '<button type="button" class="nr-utilization" data-nr-info="'+esc(info)+'" title="'+esc(info)+'" aria-label="'+esc(info)+'">'+value+'</button>';
 };
 const ticks=months.map(m=>`<span class="nr-tick" style="left:${pos(m.time)}%">${m.label}</span>`).join('');
 const lines=months.map(m=>`<i style="left:${pos(m.time)}%"></i>`).join('');
 el.innerHTML=`<div class="toolbar nr-toolbar"><label class="filter-box nr-date-filter"><span>开始日期</span><input id="nrStart" type="date" value="${rangeStart}"></label><label class="filter-box nr-date-filter"><span>结束日期</span><input id="nrEnd" type="date" value="${rangeEnd}"></label><label class="filter-box"><span>姓名</span><input id="nrSearch" type="search" value="${esc(search)}" placeholder="请输入"></label><div id="nrRoleMulti" class="multi-select"><span class="stage-label">职位</span><button type="button" class="multi-select-button" data-nr-roles aria-expanded="false" aria-controls="nrRolePanel"><span class="stage-value">${esc(role.length?role.join('、'):'全部')}</span><span class="stage-arrow">▼</span></button><div id="nrRolePanel" class="multi-select-panel"><div class="multi-select-actions"><button type="button" data-nr-all>全选</button><button type="button" data-nr-clear>清空</button></div>${roles.map(r=>`<label><input type="checkbox" name="nrRoles" value="${esc(r)}" ${role.includes(r)?'checked':''}>${esc(r)}</label>`).join('')}</div></div><div class="toolbar-actions"><button data-nr-search>搜索</button><button class="secondary" data-nr-reset>重置</button></div></div>

 <div class="nr-scroll" tabindex="0" aria-label="人员项目甘特图，可左右滚动"><div class="nr-chart" style="--nr-time:${width}px" role="table" aria-label="在职人员甘特图"><div class="nr-chart-head" role="row"><div class="nr-fixed" role="columnheader"><span>序号</span><span>职位</span><span>姓名</span><span>饱和度</span></div><div class="nr-axis" role="columnheader">${ticks}</div></div>${people.map((p,n)=>`<div class="nr-person" role="row"><div class="nr-fixed" role="cell"><span>${n+1}</span><span title="${esc(p.roles)}">${esc(p.roles||'未设置')}</span><span title="${esc(p.name)}">${esc(p.name||'未设置')}</span>${utilization(p)}</div><div class="nr-timeline" role="cell"><div class="nr-grid">${lines}</div>${leaveBars(p)}${p.issue?`<div class="nr-issue">${esc(p.issue)}</div>`:p.projects.some(included)?p.projects.filter(included).map((x,i)=>projectLane(x,i,p)).join(''):'<div class="nr-empty-person">该范围暂无项目</div>'}</div></div>`).join('')}</div></div>${people.length?'':'<div class="empty">暂无符合条件的在职人员</div>'}<div id="nrSelection" class="nr-selection" hidden role="status"></div>`;
 if(mobileView.matches){
   const toolbar=el.querySelector('.nr-toolbar');toolbar.classList.add('nr-mobile-filters');toolbar.hidden=!mobileFiltersOpen;
   const compact=document.createElement('div');compact.className='nr-mobile-query';compact.innerHTML=`<button type="button" data-nr-filters aria-expanded="${mobileFiltersOpen}" aria-label="选择日期范围">${esc(rangeStart.replaceAll('-','/'))} — ${esc(rangeEnd.replaceAll('-','/'))}</button><button type="button" data-nr-filters aria-expanded="${mobileFiltersOpen}">筛选</button>`;toolbar.before(compact);
   // Own the filter toggle here, avoiding the shared toolbar auto-toggle.
   const guard=document.createElement('span');guard.className='mobile-filter-toggle';guard.hidden=true;toolbar.prepend(guard);
   const trackWidth=Math.max(280,Math.min(1120,span/86400000*9));
   const mobileTicks=[];
   // Reserve label space at both ends, including a partial first month.
   for(const tick of [...months,{time:end-86400000}]){
     if(mobileTicks.some(t=>t.time===tick.time))continue;
     if(tick.time===end-86400000){while(mobileTicks.length>1&&(tick.time-mobileTicks.at(-1).time)/span*trackWidth<56)mobileTicks.pop();}
     if(!mobileTicks.length||(tick.time-mobileTicks.at(-1).time)/span*trackWidth>=56)mobileTicks.push(tick);
   }
   const tickHtml=mobileTicks.map((m,i)=>`<span class="nr-mobile-tick ${i===0?'first':i===mobileTicks.length-1?'last':''}" style="left:${pos(m.time)}%">${new Date(m.time).toISOString().slice(5,10).replace('-','/')}</span>`).join('');
   const cards=people.map(p=>{const projects=p.projects.filter(included),open=expandedPeople.has(String(p.id));return `<article class="nr-person-card"><div class="nr-card-heading"><button type="button" class="nr-person-toggle" data-nr-person="${p.id}" aria-expanded="${open}" aria-controls="nr-card-${p.id}"><span class="nr-person-name">${esc(p.name||'未设置')}</span><span class="nr-person-role">${esc(p.roles||'未设置')}</span><small>${projects.length}个项目</small><span class="nr-card-chevron" aria-hidden="true">${open?'⌃':'⌄'}</span></button><div class="nr-card-util">${utilization(p)}<small>饱和度</small></div></div><div id="nr-card-${p.id}" class="nr-card-body" ${open?'':'hidden'}>${leaveBars(p)?`<section class="nr-card-project"><div class="nr-card-project-name">休假</div><div class="nr-card-scroll" tabindex="0" aria-label="休假时间轴"><div class="nr-card-track"><div class="nr-card-axis">${tickHtml}</div><div class="nr-card-grid">${lines}</div>${leaveBars(p)}</div></div></section>`:''}${p.issue?`<p class="nr-card-message">${esc(p.issue)}</p>`:!projects.length?'<p class="nr-card-message">该范围暂无项目</p>':projects.map((x,i)=>`<section class="nr-card-project"><div class="nr-card-project-name"><button type="button" data-nr-info="${esc(x.name)}">${esc(x.name)}</button><span>${days(x.hours)}天</span></div><div class="nr-card-scroll" tabindex="0" aria-label="${esc(x.name)}，左右滑动查看甘特图"><div class="nr-card-track"><div class="nr-card-axis">${tickHtml}</div><div class="nr-card-grid">${lines}</div>${projectLane(x,i,p)}</div></div></section>`).join('')}<p class="nr-card-hint">左右滑动查看日期 · 点击时间条查看详情</p></div></article>`;}).join('');
   el.querySelector('.nr-scroll').outerHTML=`<div class="nr-mobile-gantt" style="--nr-mobile-time:${trackWidth}px"><div class="nr-mobile-date-strip"><div class="nr-mobile-date-title"><button type="button" data-nr-pan="-1" aria-label="向前查看日期">‹</button><strong>${esc(rangeStart.slice(0,7).replace('-','年'))}月${rangeStart.slice(0,7)!==rangeEnd.slice(0,7)?' — '+esc(rangeEnd.slice(0,7).replace('-','年'))+'月':''}</strong><button type="button" data-nr-pan="1" aria-label="向后查看日期">›</button></div><div class="nr-mobile-axis-scroll" tabindex="0" aria-label="日期条，可左右滑动"><div class="nr-card-axis">${tickHtml}</div></div></div><div class="nr-person-cards">${cards}</div></div>`;
 }
 const rolePanel=el.querySelector('#nrRolePanel');
 const updateRoleSummary=()=>{const selected=[...rolePanel.querySelectorAll('input:checked')].map(i=>i.value);el.querySelector('#nrRoleMulti .stage-value').textContent=selected.length?selected.join('、'):'全部';};
 rolePanel.addEventListener('click',e=>{e.stopPropagation();if(e.target.closest('[data-nr-all],[data-nr-clear]')){const all=!!e.target.closest('[data-nr-all]');rolePanel.querySelectorAll('input').forEach(i=>i.checked=all);updateRoleSummary();}});
 rolePanel.addEventListener('change',updateRoleSummary);
 if(mobileView.matches){
   const root=el.querySelector('.nr-mobile-gantt'),axis=root.querySelector('.nr-mobile-axis-scroll'),scrollers=[axis,...root.querySelectorAll('.nr-card-scroll')];let x=0;
   const fitLabels=node=>{const bounds=node.getBoundingClientRect();node.querySelectorAll('.nr-mobile-tick').forEach(label=>{const r=label.getBoundingClientRect();label.style.visibility=r.left>=bounds.left-1&&r.right<=bounds.right+1?'visible':'hidden';});};
   const sync=source=>{x=source.scrollLeft;for(const node of scrollers)if(node!==source&&node.clientWidth&&Math.abs(node.scrollLeft-x)>.5)node.scrollLeft=x;scrollers.forEach(fitLabels);};
   for(const node of scrollers)node.addEventListener('scroll',()=>sync(node),{passive:true});
   root.addEventListener('click',e=>{const pan=e.target.closest('[data-nr-pan]');if(pan)axis.scrollLeft+=Number(pan.dataset.nrPan)*axis.clientWidth*.7;const toggle=e.target.closest('[data-nr-person]');if(toggle){const id=toggle.dataset.nrPerson,open=!expandedPeople.has(id);if(open)expandedPeople.add(id);else expandedPeople.delete(id);toggle.setAttribute('aria-expanded',String(open));toggle.querySelector('.nr-card-chevron').textContent=open?'⌃':'⌄';const body=document.getElementById('nr-card-'+id);body.hidden=!open;if(open)body.querySelectorAll('.nr-card-scroll').forEach(node=>{node.scrollLeft=x;fitLabels(node);});}});
   const layout=()=>{const header=document.querySelector('.app-header');root.style.setProperty('--nr-mobile-top',(header?.getBoundingClientRect().height||0)+'px');for(const node of scrollers)if(node.clientWidth){node.scrollLeft=x;fitLabels(node);}};
   layoutObserver=new ResizeObserver(layout);layoutObserver.observe(root);const header=document.querySelector('.app-header');if(header)layoutObserver.observe(header);layout();return;
 }
 const scroll=el.querySelector('.nr-scroll'),chart=scroll.querySelector('.nr-chart'),head=chart.querySelector('.nr-chart-head');
 const wrapper=document.createElement('div');wrapper.className='nr-gantt';scroll.before(wrapper);
 const sticky=document.createElement('div');sticky.className='nr-sticky';sticky.innerHTML='<div class="nr-top-scroll" tabindex="0" aria-label="左右滚动人员甘特图"><div></div></div><div class="nr-head-scroll"><div class="nr-chart"></div></div>';
 wrapper.append(sticky,scroll);const top=sticky.querySelector('.nr-top-scroll'),headScroll=sticky.querySelector('.nr-head-scroll'),headChart=sticky.querySelector('.nr-chart');headChart.style.setProperty('--nr-time',width+'px');headChart.append(head);
 const sync=source=>{const x=source.scrollLeft;for(const node of [top,scroll,headScroll])if(Math.abs(node.scrollLeft-x)>0.5)node.scrollLeft=x;};
 top.addEventListener('scroll',()=>sync(top),{passive:true});scroll.addEventListener('scroll',()=>sync(scroll),{passive:true});
 const layout=()=>{const fixed=head.querySelector('.nr-fixed').getBoundingClientRect().width;top.firstElementChild.style.width=(chart.getBoundingClientRect().width-fixed)+'px';const header=document.querySelector('.app-header');const style=header&&getComputedStyle(header);wrapper.style.setProperty('--nr-sticky-top',header&&['sticky','fixed'].includes(style.position)?header.getBoundingClientRect().height+'px':'0px');sync(scroll);};
 layoutObserver=new ResizeObserver(layout);layoutObserver.observe(scroll);const appHeader=document.querySelector('.app-header');if(appHeader)layoutObserver.observe(appHeader);layout();
 let drag=null,moved=false;
 scroll.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;drag={x:e.clientX,left:scroll.scrollLeft};moved=false;});
 scroll.addEventListener('pointermove',e=>{if(!drag)return;if(Math.abs(e.clientX-drag.x)>5){moved=true;scroll.setPointerCapture(e.pointerId);scroll.scrollLeft=drag.left+drag.x-e.clientX;}});
 const finish=()=>{drag=null;};scroll.addEventListener('pointerup',finish);scroll.addEventListener('pointercancel',finish);scroll.addEventListener('pointerleave',e=>{if(!scroll.hasPointerCapture(e.pointerId))finish();});scroll.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopPropagation();moved=false;}},true);
 }
 async function load(){layoutObserver?.disconnect();const id=++ticket;document.getElementById('nrBody').innerHTML='<div class="empty">正在读取人员与工时记录…</div>';try{const result=await request('/api/personnel-report?startDate='+encodeURIComponent(rangeStart)+'&endDate='+encodeURIComponent(rangeEnd));if(id!==ticket)return;data=result;render();}catch(e){if(id!==ticket)return;document.getElementById('nrBody').innerHTML=`<div class="empty">${esc(e.message||'读取失败')}<br><button data-nr-refresh>重试</button></div>`;}}
 const hideInfo=()=>{const box=document.getElementById('nrSelection');if(box)box.hidden=true;};
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('[data-nr-info],#nrSelection'))hideInfo();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hideInfo();});
 document.addEventListener('scroll',e=>{if(!e.target.closest?.('#nrSelection'))hideInfo();},true);
 window.addEventListener('resize',hideInfo);
 window.openPersonnelReport=async()=>{let el=document.getElementById('personnelReportPage');if(!el){el=document.createElement('section');el.id='personnelReportPage';el.innerHTML='<div id="nrBody" aria-live="polite"></div>';document.getElementById('projectPage').before(el);el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-nr-filters')){mobileFiltersOpen=!mobileFiltersOpen;el.querySelector('.nr-toolbar').hidden=!mobileFiltersOpen;el.querySelectorAll('[data-nr-filters]').forEach(button=>button.setAttribute('aria-expanded',String(mobileFiltersOpen)));}else if(b.hasAttribute('data-nr-roles')){toggleMultiSelect(e,'nrRoleMulti');b.setAttribute('aria-expanded',String(document.getElementById('nrRoleMulti').classList.contains('open')));}else if(b.hasAttribute('data-nr-info')){const box=document.getElementById('nrSelection');box.textContent=b.dataset.nrInfo;box.hidden=false;
 const viewport=window.visualViewport, left=viewport?.offsetLeft||0, top=viewport?.offsetTop||0, vw=viewport?.width||innerWidth,vh=viewport?.height||innerHeight;
 box.style.width=Math.min(400,vw-24)+'px';box.style.maxHeight=Math.max(100,vh-120)+'px';
 const rect=b.getBoundingClientRect(), x=e.detail?e.clientX:Math.max(12,rect.left), y=e.detail?e.clientY:rect.bottom;
 const h=box.getBoundingClientRect().height,w=box.getBoundingClientRect().width;
 box.style.left=Math.max(left+12,Math.min(x,left+vw-w-12))+'px';
 box.style.top=Math.max(top+12,Math.min(y+12,top+vh-h-76))+'px';}else if(b.hasAttribute('data-nr-search')){const from=document.getElementById('nrStart').value,to=document.getElementById('nrEnd').value;if(!Number.isFinite(date(from))||!Number.isFinite(date(to))||from>to){showMessage('请选择有效日期范围，开始日期不能晚于结束日期');return;}const datesChanged=rangeStart!==from||rangeEnd!==to;rangeStart=from;rangeEnd=to;search=document.getElementById('nrSearch').value.trim();role=[...document.querySelectorAll('#nrRolePanel input:checked')].map(i=>i.value);if(datesChanged)load();else render();}else if(b.hasAttribute('data-nr-reset')){search='';role=[];[rangeStart,rangeEnd]=monthRange();load();}else if(b.hasAttribute('data-nr-refresh'))load();});el.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&e.target.matches('#nrSearch,#nrStart,#nrEnd')){e.preventDefault();el.querySelector('[data-nr-search]').click();}});}
 el.style.display='';const url=new URL(location.href);if(url.searchParams.has('personId')){url.searchParams.delete('personId');history.replaceState(null,'',url);}search='';role=[];expandedPeople.clear();mobileFiltersOpen=false;[rangeStart,rangeEnd]=monthRange();await load();};
})();
