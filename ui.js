/* ===========================================================
   UI chrome: toasts, theme toggle, tab navigation, modal confirm
   =========================================================== */
function toast(message, kind='ok'){
  const stack = document.getElementById('toastStack');
  if(!stack) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `${icon(kind==='ok'?'check':'alertTriangle')}<span>${message}</span>`;
  stack.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(6px)'; el.style.transition='.25s'; setTimeout(()=>el.remove(), 260); }, 3800);
}

function confirmModal(title, body, confirmLabel='Confirm'){
  return new Promise(resolve=>{
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-head">${title}<button class="modal-close">${icon('x')}</button></div>
        <div class="modal-body">${body}</div>
        <div class="modal-foot">
          <button class="btn" id="mCancel">Cancel</button>
          <button class="btn btn-danger" id="mOk" style="background:var(--critical);color:#fff;border-color:transparent;">${confirmLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const done = (val)=>{ overlay.remove(); resolve(val); };
    overlay.querySelector('.modal-close').addEventListener('click', ()=>done(false));
    overlay.querySelector('#mCancel').addEventListener('click', ()=>done(false));
    overlay.querySelector('#mOk').addEventListener('click', ()=>done(true));
    overlay.addEventListener('click', e=>{ if(e.target===overlay) done(false); });
  });
}

function applyTheme(theme){
  Store.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  const input = document.getElementById('themeSwitch');
  if(input) input.checked = (theme==='light');
  Store.saveTheme();
  // charts read CSS vars at render time, so re-render current tab's charts for correct colors
  refreshAllTabs();
}

function switchTab(tabId){
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.tab===tabId));
  document.querySelectorAll('.view-panel').forEach(p=>p.classList.toggle('active', p.id===`panel-${tabId}`));
  const titles = {
    exec: ['Executive Summary', 'Company-wide HSSE performance across all active projects'],
    projects: ['Projects Overview', 'Filter and inspect HSSE performance by individual project'],
    photos: ['Site Photos', 'Visual evidence log — organized by project, month and week'],
  };
  document.getElementById('pageTitle').textContent = titles[tabId][0];
  document.getElementById('pageSub').textContent = titles[tabId][1];
  document.getElementById('topbarFilters-exec').classList.toggle('hidden', tabId!=='exec');
  document.getElementById('topbarFilters-projects').classList.toggle('hidden', tabId!=='projects');
  document.getElementById('topbarFilters-photos').classList.toggle('hidden', tabId!=='photos');
  if(window.innerWidth<=680) document.getElementById('sidebar').classList.remove('open');
  if(tabId==='exec') renderExecutiveSummary();
  if(tabId==='projects') renderProjectsTab();
  if(tabId==='photos'){ renderPhotosFilters(); renderPhotosGallery(); }
}

function refreshAllTabs(){
  const active = document.querySelector('.nav-item.active');
  const tabId = active ? active.dataset.tab : 'exec';
  document.getElementById('lastUpdatedNote').textContent = `Data as of ${new Date().toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}`;
  switchTab(tabId);
}
