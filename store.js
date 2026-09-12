/* ===========================================================
   State store: records, photos, theme, filters + persistence
   =========================================================== */
const Store = {
  records: [],   // array of record objects (see data.js shape)
  photos: [],    // array of {id, caption, project, date, month, dataUrl}
  theme: 'dark',
  filters: {
    execMonth: 'all',           // executive tab month filter ('all' = latest snapshot per project)
    project: PROJECTS[0].id,    // active project on the "Projects" tab
    projMonth: 'all',
    projWeek: 'all',
    galProject: 'all',
    galMonth: 'all',
  },

  load(){
    try{
      const r = localStorage.getItem(STORAGE_KEYS.records);
      const p = localStorage.getItem(STORAGE_KEYS.photos);
      const t = localStorage.getItem(STORAGE_KEYS.theme);
      this.records = r ? JSON.parse(r) : makeSeedRecords();
      this.photos  = p ? JSON.parse(p) : JSON.parse(JSON.stringify(window.SEED_PHOTOS || []));
      this.theme   = t || 'dark';
    }catch(e){
      console.warn('Store.load failed, falling back to seed data', e);
      this.records = makeSeedRecords();
      this.photos = window.SEED_PHOTOS || [];
      this.theme = 'dark';
    }
    if(!Array.isArray(this.records) || this.records.length===0) this.records = makeSeedRecords();
  },
  saveRecords(){ try{ localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(this.records)); }catch(e){ console.warn('save records failed', e); } },
  savePhotos(){ try{ localStorage.setItem(STORAGE_KEYS.photos, JSON.stringify(this.photos)); }catch(e){ console.warn('save photos failed (storage full?)', e); toast('Photo storage is nearly full — consider exporting & clearing older photos.', 'err'); } },
  saveTheme(){ try{ localStorage.setItem(STORAGE_KEYS.theme, this.theme); }catch(e){} },

  /** Insert or update a record, matched by project+month+date */
  upsertRecord(rec){
    rec.month = rec.month || toMonthKey(rec.date);
    const idx = this.records.findIndex(r => r.project===rec.project && r.date===rec.date);
    if(idx>=0) this.records[idx] = { ...this.records[idx], ...rec };
    else this.records.push(rec);
  },

  recordsForProject(pid){
    return this.records.filter(r=>r.project===pid).sort((a,b)=> a.date < b.date ? 1 : -1);
  },
  latestRecordForProject(pid){
    const rs = this.recordsForProject(pid);
    return rs[0] || null;
  },
  distinctMonths(){
    return [...new Set(this.records.map(r=>r.month))].sort().reverse();
  },
  distinctMonthsForProject(pid){
    return [...new Set(this.records.filter(r=>r.project===pid).map(r=>r.month))].sort().reverse();
  },
  distinctDatesForProject(pid, month){
    return this.records
      .filter(r=>r.project===pid && (month==='all' || r.month===month))
      .map(r=>r.date).sort().reverse();
  },
  /** latest record per project at/under a given month filter ('all' = each project's own latest) */
  snapshotForExecutive(monthFilter){
    return PROJECTS.map(p=>{
      const rs = this.recordsForProject(p.id);
      if(rs.length===0) return null;
      if(monthFilter==='all') return rs[0];
      const inMonth = rs.filter(r=>r.month===monthFilter);
      return inMonth[0] || null;
    }).filter(Boolean);
  },
};
