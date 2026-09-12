/* ===========================================================
   App bootstrap & event wiring
   =========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  Store.load();
  applyThemeSilent(Store.theme);
  wireNav();
  wireFilters();
  wireThemeToggle();
  wireIO();
  wirePhotoUpload();
  wireSidebarMobile();
  switchTab('exec');
});

function applyThemeSilent(theme){
  document.documentElement.setAttribute('data-theme', theme);
  const input = document.getElementById('themeSwitch');
  if(input) input.checked = (theme==='light');
  updateThemeLabel(theme);
}
function updateThemeLabel(theme){
  const label = document.getElementById('themeLabel');
  if(label) label.innerHTML = (theme==='light' ? icon('sun') : icon('moon')) + (theme==='light' ? 'Light Mode' : 'Dark Mode');
}

function wireNav(){
  document.querySelectorAll('.nav-item').forEach(btn=>{
    btn.addEventListener('click', ()=> switchTab(btn.dataset.tab));
  });
}

function wireFilters(){
  document.getElementById('execMonthFilter').addEventListener('change', (e)=>{
    Store.filters.execMonth = e.target.value; renderExecutiveSummary();
  });
  document.getElementById('projMonthFilter').addEventListener('change', (e)=>{
    Store.filters.projMonth = e.target.value; Store.filters.projWeek = 'all'; renderProjectsTab();
  });
  document.getElementById('projWeekFilter').addEventListener('change', (e)=>{
    Store.filters.projWeek = e.target.value; renderProjectsTab();
  });
  document.getElementById('galProjectFilter').addEventListener('change', (e)=>{
    Store.filters.galProject = e.target.value; renderPhotosGallery();
  });
  document.getElementById('galMonthFilter').addEventListener('change', (e)=>{
    Store.filters.galMonth = e.target.value; renderPhotosGallery();
  });
}

function wireThemeToggle(){
  document.getElementById('themeSwitch').addEventListener('change', (e)=>{
    const theme = e.target.checked ? 'light' : 'dark';
    updateThemeLabel(theme);
    applyTheme(theme);
  });
}

function wireIO(){
  document.getElementById('btnExportExcel').addEventListener('click', exportExcel);
  document.getElementById('btnExportPdf').addEventListener('click', exportExecutiveAnalysisReport);
  document.getElementById('btnExportJson').addEventListener('click', exportJsonBackup);

  const importInput = document.getElementById('importFileInput');
  document.getElementById('btnImport').addEventListener('click', ()=> importInput.click());
  importInput.addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    if(/\.xlsx?$/i.test(file.name)) importExcelFile(file);
    else if(/\.json$/i.test(file.name)) importJsonFile(file);
    else toast('Please choose a .xlsx or .json file exported from this dashboard.', 'err');
    e.target.value = '';
  });

  document.getElementById('btnClearData').addEventListener('click', async ()=>{
    const ok = await confirmModal('Reset dashboard data?',
      'This clears all imported reporting data and uploaded photos on this device and restores the original July 2026 baseline. This cannot be undone — export a backup first if you want to keep your changes.',
      'Reset to baseline');
    if(!ok) return;
    Store.records = makeSeedRecords();
    Store.photos = window.SEED_PHOTOS ? window.SEED_PHOTOS.slice() : [];
    Store.saveRecords(); Store.savePhotos();
    refreshAllTabs();
    toast('Dashboard reset to the original baseline.', 'ok');
  });
}

function wirePhotoUpload(){
  const zone = document.getElementById('uploadZone');
  const input = document.getElementById('photoFileInput');
  zone.addEventListener('click', ()=> input.click());
  input.addEventListener('change', (e)=>{ if(e.target.files.length) handleFiles(e.target.files); e.target.value=''; });
  ['dragenter','dragover'].forEach(evt=> zone.addEventListener(evt, e=>{ e.preventDefault(); zone.classList.add('dragover'); }));
  ['dragleave','drop'].forEach(evt=> zone.addEventListener(evt, e=>{ e.preventDefault(); zone.classList.remove('dragover'); }));
  zone.addEventListener('drop', e=>{ if(e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });
}

function wireSidebarMobile(){
  const btn = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if(btn) btn.addEventListener('click', ()=> sidebar.classList.toggle('open'));
}
