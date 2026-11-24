/* Shared parent/child presentation for menu maintenance and role assignment. */
function menuForest(rows){
 const nodes=new Map(rows.map(r=>[String(r.ID),{row:r,children:[]}])),roots=[];
 for(const node of nodes.values()){const parent=nodes.get(String(node.row['父级ID']));let cur=parent,seen=new Set([String(node.row.ID)]),cycle=false;while(cur){const id=String(cur.row.ID);if(seen.has(id)){cycle=true;break;}seen.add(id);cur=nodes.get(String(cur.row['父级ID']));}if(parent&&!cycle)parent.children.push(node);else roots.push(node);}
 const sort=items=>{items.sort((a,b)=>Number(a.row['排序']||0)-Number(b.row['排序']||0)||Number(a.row.ID)-Number(b.row.ID));items.forEach(n=>sort(n.children));};sort(roots);return roots;
}
function treeControls(){return '<div class="menu-tree-tools"><button type="button" class="secondary" onclick="this.closest(\'.menu-tree-panel\').querySelectorAll(\'details\').forEach(d=>d.open=true)">展开全部</button><button type="button" class="secondary" onclick="this.closest(\'.menu-tree-panel\').querySelectorAll(\'details\').forEach(d=>d.open=false)">收起全部</button></div>';}
function renderMenuManagementTree(wrap,toolbar,filtered){
 const keep=new Set(filtered.map(r=>String(r.ID))),all=new Map(genericRows.map(r=>[String(r.ID),r]));
 for(const row of filtered){let r=row,seen=new Set();while(r&&!seen.has(String(r.ID))){seen.add(String(r.ID));keep.add(String(r.ID));r=all.get(String(r['父级ID']));}}
 const nodes=menuForest(genericRows.filter(r=>keep.has(String(r.ID))));
 const render=items=>'<ul class="menu-tree">'+items.map(n=>{const r=n.row,id=Number(r.ID),name=escapeHtml(r['菜单名称']);const content=`<span class="menu-tree-title">${name}<small>${escapeHtml(({DIR:'目录',MENU:'菜单',BUTTON:'按钮'})[r['类型']]||r['类型'])}</small></span><span class="menu-tree-meta">${escapeHtml(r['菜单编码'])} · ${escapeHtml(r['状态'])}</span><span class="row-actions"><button type="button" class="icon-btn" title="编辑" aria-label="编辑${name}" onclick="event.preventDefault();event.stopPropagation();openGenericEdit(${id})">✎</button><button type="button" class="icon-btn danger" title="删除" aria-label="删除${name}" onclick="event.preventDefault();event.stopPropagation();deleteGenericRecord(${id})">🗑</button></span>`;return '<li>'+ (n.children.length?`<details open><summary class="menu-tree-row">${content}</summary>${render(n.children)}</details>`:`<div class="menu-tree-row menu-tree-leaf">${content}</div>` )+'</li>';}).join('')+'</ul>';
 wrap.innerHTML=toolbar+(nodes.length?`<div class="table-card menu-tree-panel">${treeControls()}${render(nodes)}<div class="table-footer">共 ${filtered.length} 条记录</div></div>`:'<div class="empty">暂无匹配菜单</div>');window.refreshResponsiveUi?.();
}
function renderRoleMenuTree(data){
 const assigned=new Set((data.assigned||[]).map(String));
 const rows=(data.menus||[]).filter(r=>r['类型']==='DIR'||r['类型']==='MENU');
 const render=items=>'<ul class="menu-tree">'+items.map(n=>{const r=n.row,enabled=r['状态']==='启用'&&r['显示']==='是';return `<li><div class="role-tree-row"><button type="button" class="tree-toggle" ${n.children.length?'':'disabled'} aria-label="展开或收起${escapeAttr(r['菜单名称'])}" aria-expanded="true" onclick="const branch=this.closest('li').querySelector(':scope > ul');if(branch){branch.hidden=!branch.hidden;this.textContent=branch.hidden?'›':'⌄';this.setAttribute('aria-expanded',String(!branch.hidden));}">${n.children.length?'⌄':'·'}</button><label><input type="checkbox" ${r['类型']==='MENU'?`data-menu-id="${escapeAttr(r.ID)}" value="${escapeAttr(r.ID)}"`: 'data-menu-group'} ${assigned.has(String(r.ID))?'checked':''} ${enabled?'':'disabled'}><span>${escapeHtml(r['菜单名称'])}</span></label></div>${n.children.length?render(n.children):''}</li>`;}).join('')+'</ul>';
 document.getElementById('formBody').innerHTML=`<div class="form-section"><div class="form-section-title">菜单权限</div><div id="roleMenuChecks" class="menu-tree-panel">${render(menuForest(rows))}</div></div>`;
 const host=document.getElementById('roleMenuChecks');
 const refresh=()=>{host.querySelectorAll('[data-menu-group]').forEach(box=>{const children=[...box.closest('li').querySelectorAll('[data-menu-id]:not(:disabled)')];box.checked=children.length>0&&children.every(c=>c.checked);box.indeterminate=children.some(c=>c.checked)&&!box.checked;box.disabled=!children.length;});};
 host.addEventListener('change',e=>{if(!e.target.matches('input'))return;const box=e.target;box.closest('li').querySelectorAll('input:not(:disabled)').forEach(c=>c.checked=box.checked);refresh();});refresh();
}
