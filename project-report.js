/* Project report: shared data and rendering across desktop, tablet and phone. */
(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const colors=['#168f82','#398acb','#b484cf','#d69a32','#637f91','#c16c77','#778c47','#766fc2','#649caa'];
  const order=['报价','需求','开发','测试','UAT','等待上线','已完成','完成','暂停','运维'];
  let report=null, selected=null, version=0, scale='week';
  let axisObserver=null;
  function fitAxisLabels(){
    const axis=document.querySelector('#projectReportPage .pr-axis');
    if(!axis || !axis.getBoundingClientRect().width)return;
    const labels=[...axis.children];
    labels.forEach(label=>label.style.visibility='visible');
    if(labels.length<3)return;
    const last=labels.at(-1).getBoundingClientRect();
    let right=labels[0].getBoundingClientRect().right;
    for(const label of labels.slice(1,-1)){
      const box=label.getBoundingClientRect();
      if(box.left<right+14 || box.right>last.left-14)label.style.visibility='hidden';
      else right=box.right;
    }
  }
  const fmt=n=>Number(n||0).toLocaleString('zh-CN',{maximumFractionDigits:2});
  const overBudget=item=>Number.isFinite(item.hours)&&Number.isFinite(item.actualHours)&&item.actualHours>item.hours;
  const days=hours=>fmt(Number(hours||0)/8);
  const date=n=>new Date(n).toISOString().slice(0,10);
  const ms=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&s!=='0000-00-00'?Date.parse(s+'T00:00:00Z'):NaN;
  function defaults(){const now=new Date();const y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,'0');document.getElementById('prStart').value=`${y}-${m}-01`;document.getElementById('prEnd').value=`${y}-${m}-${new Date(y,now.getMonth()+1,0).getDate()}`;}
  function stats(){const groups=new Map();for(const p of report.projects){if(!groups.has(p.stage))groups.set(p.stage,{stage:p.stage,hours:0,count:0,unknown:0});const g=groups.get(p.stage);g.count++;g.hours+=p.hours??0;if(p.hours===null)g.unknown++;}return [...groups.values()].sort((a,b)=>(order.indexOf(a.stage)<0?99:order.indexOf(a.stage))-(order.indexOf(b.stage)<0?99:order.indexOf(b.stage)));}
  function issues(){const items=report.projects.filter(p=>p.stage!=='报价'&&p.issue);return (items.length?`<details class="pr-issues"><summary>有 ${items.length} 个PO工时待确认，不计入占比分母（点击查看）</summary>${items.map(p=>`<p>${esc(p.name)}：${esc(p.issue)}</p>`).join('')}</details>`:'');}
  function renderStageFilter(){
    const host=document.getElementById("prStages");if(!host)return;host.classList.remove("open");host.hidden=selected===null;if(selected===null)return;
    const stages=[...new Set([...order,...(report?.projects||[]).map(p=>p.stage)])];
    host.innerHTML=`<span class="stage-label">阶段</span><button type="button" class="multi-select-button" onclick="toggleMultiSelect(event, 'prStages')"><span class="stage-value">${esc(selected.length?selected.join("、"):"全部")}</span><span class="stage-arrow">▼</span></button><div class="multi-select-panel" onclick="event.stopPropagation()">${multiSelectActionHtml("prStage", "prStages")}${stages.map(stage=>`<label><input type="checkbox" name="prStage" value="${esc(stage)}" ${selected.includes(stage)?"checked":""}>${esc(stage)}</label>`).join("")}</div>`;
  }
  function summary(){axisObserver?.disconnect();selected=null;renderStageFilter();document.querySelector('#projectReportPage [data-back]')?.setAttribute('hidden','');const groups=stats(),total=groups.reduce((n,g)=>n+g.hours,0);let offset=0;
    const arcs=groups.map((g,i)=>{const percent=total?g.hours/total*100:0, dash=percent*6.283185307;const html=percent?`<circle class="pr-arc" cx="140" cy="140" r="100" fill="none" stroke="${colors[i%colors.length]}" stroke-width="38" stroke-dasharray="${dash} ${628.3185307-dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 140 140)" data-stage="${esc(g.stage)}" role="button" tabindex="0" aria-label="${esc(g.stage)} ${fmt(percent)}%，查看迭代甘特图"><title>${esc(g.stage)}：${days(g.hours)}天，${fmt(percent)}%</title></circle>`:'';offset+=dash;return html;}).join('');
    document.getElementById('prContent').innerHTML=`<div class="pr-kpis"><div data-all-projects role="button" tabindex="0" title="查看全部项目甘特图" aria-label="查看全部项目甘特图">项目数<strong>${report.projects.length}<span class="pr-count-arrow" aria-hidden="true">›</span></strong><span class="pr-count-hint">查看项目明细</span></div><div>预计总工作量<strong>${days(total)}<small> 天</small></strong></div><div>实际工作量总数<strong>${days(report.projects.reduce((n,p)=>n+(p.actualHours??0),0))}<small> 天</small></strong></div></div>${issues()}${!groups.length?'<div class="empty">所选日期范围内暂无项目</div>':`<div class="pr-overview"><div class="pr-donut"><svg viewBox="0 0 280 280" aria-label="各阶段预计工作量占比"><circle cx="140" cy="140" r="100" fill="none" stroke="#e8efed" stroke-width="38"/>${arcs}<text x="140" y="137" text-anchor="middle" class="pr-total">${days(total)}</text><text x="140" y="163" text-anchor="middle">预计总工作量（天）</text></svg><p>${total?'点击环形图或右侧阶段查看项目迭代':'暂无可计算的预计工作量，仍可点击阶段查看项目'}</p></div><div><h3>阶段工作量明细</h3><div class="pr-stage-head"><span>阶段</span><span>占比</span><span>预计工作量</span><span>项目数</span><span></span></div>${groups.map((g,i)=>`<button class="pr-stage-row" data-stage="${esc(g.stage)}"><span><i style="background:${colors[i%colors.length]}"></i>${esc(g.stage)}</span><span>${total&&g.unknown<g.count?fmt(g.hours/total*100)+'%':'—'}</span><span>${g.unknown===g.count?'待确认':days(g.hours)+'天'+(g.unknown?'（已知）':'')}</span><span>${g.count}个</span><span aria-hidden="true">›</span></button>`).join('')}</div></div>`}`;
  }
  function gantt(value){const chosen=Array.isArray(value)?value:[value];selected=chosen;renderStageFilter();const stage=chosen.length?chosen.join('、'):'全部阶段';if(stage==='报价'){selected=chosen;axisObserver?.disconnect();document.querySelector('#projectReportPage [data-back]')?.removeAttribute('hidden');const projects=report.projects.filter(p=>p.stage===stage);document.getElementById('prContent').innerHTML='<div class="pr-gantt-heading"><h3>报价 · 项目列表</h3></div><p class="pr-note">报价阶段无需匹配禅道，预计工作量取PO报Rena的PM、开发、测试、UI天数之和。</p>'+projects.map(p=>'<div class="pr-project pr-quote-project"><strong>'+esc(p.name)+'</strong><p>预计工作量：'+days(p.hours)+'天</p><p>PM：'+esc(p.pm||'—')+'</p><p>PO日期：'+esc(p.start||'未设置')+' 至 '+esc(p.end||'未设置')+'</p></div>').join('');return;}selected=chosen;document.querySelector('#projectReportPage [data-back]')?.removeAttribute('hidden');const projects=report.projects.filter(p=>!chosen.length||chosen.includes(p.stage)),iterations=projects.flatMap(p=>p.iterations);const valid=iterations.flatMap(i=>[{start:i.start,end:i.end},{start:i.actualStart,end:i.actualEnd}]).filter(i=>Number.isFinite(ms(i.start))&&Number.isFinite(ms(i.end))&&ms(i.start)<=ms(i.end));
    let min=Math.min(ms(report.start),...valid.map(i=>ms(i.start))), max=Math.max(ms(report.end),...valid.map(i=>ms(i.end)));max+=86400000;const span=max-min;
    // Always show complete iteration periods. Limit tick count for long projects.
    const ticks=[min];
    if(scale==='month'){
      const cursor=new Date(min);cursor.setUTCDate(1);cursor.setUTCMonth(cursor.getUTCMonth()+1);
      const step=Math.max(1,Math.ceil(span/2592000000/10));
      while(cursor.getTime()<max-86400000){ticks.push(cursor.getTime());cursor.setUTCMonth(cursor.getUTCMonth()+step);}
    }else{
      const step=Math.max(1,Math.ceil(span/604800000/10));
      const cursor=new Date(min);cursor.setUTCDate(cursor.getUTCDate()+((8-cursor.getUTCDay())%7||7));
      while(cursor.getTime()<max-86400000){ticks.push(cursor.getTime());cursor.setUTCDate(cursor.getUTCDate()+7*step);}
    }
    if(max-86400000>min)ticks.push(max-86400000);
    const actualDates=it=>Number.isFinite(ms(it.actualStart))&&Number.isFinite(ms(it.actualEnd))&&ms(it.actualStart)<=ms(it.actualEnd);
    const bar=(it,i)=>{
      const color=colors[i%colors.length];
      const render=(start,end,actual,segment)=>{
        const a=ms(start),b=ms(end);if(!Number.isFinite(a)||!Number.isFinite(b)||a>b)return actual?'':'<span class="pr-no-date">预计日期待维护</span>';
        const label=actual?'实际':'预计';
        return `<button class="pr-bar${actual?' pr-actual':''}" style="left:${(a-min)/span*100}%;width:${Math.max(actual?0:.3,(b-a+86400000)/span*100)}%;background:${actual?color:color+'55'}" data-iteration="${it.id}" ${segment?`data-segment-info="${esc('本段实际：'+start+' 至 '+end+'，本段工作量：'+days(segment.hours)+'天')}"`: ''} title="${esc(it.name)} · ${label}：${esc(start)} 至 ${esc(end)}" aria-label="${esc(it.name)}，${label}日期${esc(start)}至${esc(end)}，查看详情"></button>`;
      };
      return render(it.start,it.end,false)+(Array.isArray(it.actualSegments)?it.actualSegments.map(segment=>render(segment.start,segment.end,true,segment)).join(''):render(it.actualStart,it.actualEnd,true));
    };
    document.getElementById('prContent').innerHTML=`<div class="pr-gantt-heading"><h3>${esc(stage)} · 项目迭代甘特图</h3></div><div class="pr-kpis"><div>项目数<strong>${projects.length}</strong></div><div>迭代数<strong>${iterations.length}</strong></div><div>PO预计总工作量<strong>${days(projects.reduce((n,p)=>n+(p.hours??0),0))}<small> 天</small></strong></div></div><div class="pr-gantt-tools"><strong>迭代计划</strong><span class="pr-bar-legend"><i></i>浅色：预计　<b></b>深色：实际</span><button data-scale="week" aria-pressed="${scale==='week'}">周</button><button data-scale="month" aria-pressed="${scale==='month'}">月</button><button data-expand="true">展开全部</button><button data-expand="false">收起全部</button></div><div class="pr-gantt-scroll"><div class="pr-gantt-grid"><div class="pr-axis-row"><strong>PO / 禅道迭代名</strong><div class="pr-axis">${ticks.map((t,i)=>`<span style="left:${(t-min)/span*100}%">${esc(date(t))}</span>`).join('')}</div></div>${projects.map(p=>`<details class="pr-project${overBudget(p)?' pr-over-budget':''}" open><summary><strong>${esc(p.name)}</strong>${overBudget(p)?'<span class="pr-over-label">实际工作量超出预计</span>':''}<span>PM：${esc(p.pm||'—')}</span><span>PO预计：${p.hours===null?'待确认':days(p.hours)+'天'}</span><span>实际：${p.actualHours==null?'待确认':days(p.actualHours)+'天'}</span></summary>${p.stage==='报价'?'<p class="pr-note">报价阶段无需匹配禅道，预计工作量取报Rena加总。</p>':p.issue?`<p class="pr-note">${esc(p.issue)}</p>`:!p.iterations.length?'<p class="pr-note">禅道暂无迭代</p>':''}${p.iterations.map((it,i)=>`<div class="pr-iteration-row${overBudget(it)?' pr-over-budget':''}"><div class="pr-iteration-label">${esc(it.name)}${overBudget(it)?'<small class="pr-over-label">实际工作量超出预计</small>':''}<small class="pr-date-work"><span>预计：${esc(it.start||'未设置')} 至 ${esc(it.end||'未设置')}</span><strong title="预计工作量：${it.hours==null?'待确认':fmt(it.hours)+'小时 ÷ 8 = '+days(it.hours)+'天'}">${it.hours==null?'待确认':days(it.hours)+'天'}</strong></small><small class="pr-date-work"><span>实际：${actualDates(it)?esc(it.actualStart)+' 至 '+esc(it.actualEnd):'日期待维护'}</span><strong title="实际工作量：${it.actualHours==null?'待确认':fmt(it.actualHours)+'小时 ÷ 8 = '+days(it.actualHours)+'天'}">${it.actualHours==null?'待确认':days(it.actualHours)+'天'}</strong></small></div><div class="pr-track">${bar(it,i)}</div></div>`).join('')}</details>`).join('')}</div></div><p class="pr-note">浅色为迭代预计周期；深色为任务实际开始至实际结束日期，断档分段，缺日期不绘制。点击时间条查看详情。</p><div id="prIterationDetail" class="pr-iteration-detail" role="status" hidden></div>`;
    axisObserver?.disconnect();
    axisObserver=new ResizeObserver(fitAxisLabels);
    axisObserver.observe(document.querySelector('#projectReportPage .pr-axis'));
    fitAxisLabels();
  }
  window.openProjectReport=async()=>{
    if(!document.getElementById('projectReportPage')){const section=document.createElement('section');section.id='projectReportPage';section.innerHTML=`<div class="toolbar pr-toolbar" data-enter-search="loadProjectReport"><label class="filter-box pr-date-filter"><span>开始日期</span><input id="prStart" type="date" class="date-input"></label><label class="filter-box pr-date-filter"><span>结束日期</span><input id="prEnd" type="date" class="date-input"></label><div id="prStages" class="multi-select filter-box" hidden></div><div class="toolbar-actions"><button data-back hidden>‹ 返回阶段占比</button><button data-search>搜索</button><button class="secondary" data-reset>重置</button></div></div><div id="prContent" aria-live="polite"></div>`;document.getElementById('projectPage').before(section);defaults();section.addEventListener('click',event=>{const t=event.target.closest('button,[data-stage],[data-all-projects]');if(!t)return;if(t.hasAttribute('data-search'))loadProjectReport();if(t.hasAttribute('data-reset')){defaults();if(selected!==null){selected=[];renderStageFilter();}loadProjectReport();}if(t.hasAttribute('data-all-projects'))gantt([]);if(t.hasAttribute('data-stage'))gantt(t.dataset.stage);if(t.hasAttribute('data-back'))summary();if(t.hasAttribute('data-scale')){scale=t.dataset.scale;gantt(selected);}if(t.hasAttribute('data-expand'))section.querySelectorAll('.pr-project').forEach(d=>d.open=t.dataset.expand==='true');if(t.hasAttribute('data-iteration')){const it=report.projects.flatMap(p=>p.iterations).find(i=>String(i.id)===t.dataset.iteration);if(it){const box=document.getElementById('prIterationDetail');box.hidden=false;box.textContent=(t.dataset.segmentInfo?t.dataset.segmentInfo+'　':'')+`${it.name}　预计日期：${it.start||'未设置'} 至 ${it.end||'未设置'}　实际日期：${it.actualStart||'未设置'} 至 ${it.actualEnd||'未设置'}　预计工作量：${it.hours==null?'待确认':days(it.hours)+'天'}　实际工作量：${it.actualHours==null?'待确认':days(it.actualHours)+'天'}`;box.scrollIntoView({block:'nearest',behavior:'smooth'});}}});section.addEventListener('change',e=>{if(e.target.name==='prStage'){const text=[...section.querySelectorAll('[name=prStage]:checked')].map(i=>i.value).join('、');section.querySelector('#prStages .stage-value').textContent=text||'全部';}});section.addEventListener('keydown',e=>{if(e.target.matches('[data-all-projects]')&&['Enter',' '].includes(e.key)){e.preventDefault();gantt([]);}if(e.target.matches('[data-stage]')&&['Enter',' '].includes(e.key)){e.preventDefault();gantt(e.target.dataset.stage);}});}
    document.getElementById('projectReportPage').style.display='';initializeDateInputs();await loadProjectReport();
  };
  window.loadProjectReport=async()=>{
    const from=document.getElementById('prStart').value,to=document.getElementById('prEnd').value;
    if(!Number.isFinite(ms(from))||!Number.isFinite(ms(to))||from>to){showMessage('请填写有效日期范围，开始日期不能晚于结束日期');return;}
    const requestedStages=selected===null?null:[...document.querySelectorAll('[name=prStage]:checked')].map(i=>i.value);const ticket=++version;document.getElementById('prContent').innerHTML='<div class="empty">正在读取项目与禅道数据…</div>';
    try{const data=await request('/api/project-report?startDate='+encodeURIComponent(from)+'&endDate='+encodeURIComponent(to));if(ticket!==version)return;report=data;if(requestedStages===null)summary();else gantt(requestedStages);}catch(error){if(ticket!==version)return;document.getElementById('prContent').innerHTML=`<div class="empty">${esc(error.message||'报表读取失败')}<br><button data-search>重新加载</button></div>`;}
  };
})();
