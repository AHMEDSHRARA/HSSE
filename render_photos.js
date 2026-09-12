/* ===========================================================
   Site Photos tab — upload, tag by project/month/week, gallery, lightbox
   =========================================================== */
function renderPhotosFilters(){
  const projSel = document.getElementById('galProjectFilter');
  const monthSel = document.getElementById('galMonthFilter');
  if(projSel && projSel.options.length<=1){
    projSel.innerHTML = `<option value="all">All Projects</option>` + PROJECTS.map(p=>`<option value="${p.id}">${p.short}</option>`).join('');
  }
  const months = [...new Set(Store.photos.map(p=>p.month))].sort().reverse();
  if(monthSel){
    monthSel.innerHTML = `<option value="all">All Months</option>` + months.map(m=>`<option value="${m}">${monthLabel(m)}</option>`).join('');
    monthSel.value = months.includes(Store.filters.galMonth) ? Store.filters.galMonth : 'all';
    Store.filters.galMonth = monthSel.value;
  }
  if(projSel) projSel.value = Store.filters.galProject;

  // default tag form date = today
  const dateInput = document.getElementById('uploadDate');
  if(dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0,10);
  const uploadProjSel = document.getElementById('uploadProject');
  if(uploadProjSel && uploadProjSel.options.length<=0){
    uploadProjSel.innerHTML = PROJECTS.map(p=>`<option value="${p.id}">${p.short}</option>`).join('');
  }
}

function renderPhotosGallery(){
  const host = document.getElementById('galleryHost');
  if(!host) return;
  const filtered = Store.photos.filter(p =>
    (Store.filters.galProject==='all' || p.project===Store.filters.galProject) &&
    (Store.filters.galMonth==='all' || p.month===Store.filters.galMonth)
  ).sort((a,b)=> a.date < b.date ? 1 : -1);

  document.getElementById('galCount').textContent = `${filtered.length} photo${filtered.length!==1?'s':''}`;

  if(filtered.length===0){
    host.innerHTML = `<div class="empty-state">${icon('image')}<div>No photos match this filter yet.<br>Upload site photos below and tag them by project, month and week.</div></div>`;
    return;
  }
  const byMonth = {};
  filtered.forEach(p=>{ (byMonth[p.month] = byMonth[p.month]||[]).push(p); });
  const months = Object.keys(byMonth).sort().reverse();
  host.innerHTML = months.map(m=>`
    <div class="gallery-month">
      <div class="gallery-month-title">${monthLabel(m)}<span class="line"></span><span style="color:var(--text-muted);font-weight:600;">${byMonth[m].length} photo${byMonth[m].length!==1?'s':''}</span></div>
      <div class="gallery-grid">
        ${byMonth[m].map(p=>photoCardHtml(p)).join('')}
      </div>
    </div>
  `).join('');

  host.querySelectorAll('.photo-card').forEach(card=>{
    card.addEventListener('click', ()=> openLightbox(card.dataset.id));
  });
}

function photoCardHtml(p){
  const proj = PROJECT_BY_ID[p.project];
  return `<div class="photo-card" data-id="${p.id}">
    <div class="ph-img-wrap"><img src="${p.dataUrl}" alt="${escapeHtml(p.caption)}" loading="lazy"></div>
    <div class="ph-body">
      <div class="ph-cap">${escapeHtml(p.caption || 'Untitled photo')}</div>
      <div class="ph-meta">
        <span class="tag" style="background:${cssVar(proj.colorVar)}22;color:${cssVar(proj.colorVar)}">${proj.short}</span>
        <span class="ph-date">${fmtDate(p.date)}</span>
      </div>
    </div>
  </div>`;
}

function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

function openLightbox(id){
  const p = Store.photos.find(x=>x.id===id);
  if(!p) return;
  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  document.body.appendChild(overlay);
  renderLightboxView(overlay, id);
  const close = ()=> overlay.remove();
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) close(); });
  overlay._close = close;
}

function renderLightboxView(overlay, id){
  const p = Store.photos.find(x=>x.id===id);
  if(!p){ overlay.remove(); return; }
  const proj = PROJECT_BY_ID[p.project];
  overlay.innerHTML = `
    <div class="lightbox-inner">
      <img src="${p.dataUrl}" alt="${escapeHtml(p.caption)}">
      <div class="lightbox-body">
        <div style="flex:1; min-width:0;">
          <div style="font-weight:800;font-size:14px;margin-bottom:4px;">${escapeHtml(p.caption||'Untitled photo')}</div>
          <div style="font-size:12px;color:var(--text-muted);">${proj.name} · ${fmtDate(p.date)} · ${monthLabel(p.month)}</div>
        </div>
        <div style="display:flex; gap:8px; flex:0 0 auto;">
          <button class="btn btn-sm" id="editPhotoBtn">${icon('edit')} Edit Caption</button>
          <button class="btn btn-danger btn-sm" id="deletePhotoBtn">${icon('trash')} Delete</button>
        </div>
      </div>
    </div>
    <button class="lightbox-close" aria-label="Close">${icon('x')}</button>
  `;
  overlay.querySelector('.lightbox-close').addEventListener('click', overlay._close || (()=>overlay.remove()));
  overlay.querySelector('#deletePhotoBtn').addEventListener('click', ()=>{
    Store.photos = Store.photos.filter(x=>x.id!==id);
    Store.savePhotos();
    renderPhotosFilters(); renderPhotosGallery();
    overlay.remove(); toast('Photo deleted.','ok');
  });
  overlay.querySelector('#editPhotoBtn').addEventListener('click', ()=> renderLightboxEdit(overlay, id));
}

function renderLightboxEdit(overlay, id){
  const p = Store.photos.find(x=>x.id===id);
  if(!p){ overlay.remove(); return; }
  overlay.innerHTML = `
    <div class="lightbox-inner">
      <img src="${p.dataUrl}" alt="${escapeHtml(p.caption)}">
      <div class="lightbox-body" style="flex-direction:column; align-items:stretch; gap:12px;">
        <div class="upload-meta-row" style="margin-top:0;">
          <div class="field" style="flex:1;">
            <label>Caption / Comment</label>
            <input type="text" id="editCaptionInput" value="${escapeHtml(p.caption)}" placeholder="Add a caption or comment for this photo">
          </div>
          <div class="field">
            <label>Project</label>
            <select id="editProjectInput">${PROJECTS.map(pr=>`<option value="${pr.id}" ${pr.id===p.project?'selected':''}>${pr.short}</option>`).join('')}</select>
          </div>
          <div class="field">
            <label>Week / Date Taken</label>
            <input type="date" id="editDateInput" value="${p.date}">
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-sm" id="cancelEditBtn">Cancel</button>
          <button class="btn btn-accent btn-sm" id="saveEditBtn">${icon('check')} Save Changes</button>
        </div>
      </div>
    </div>
    <button class="lightbox-close" aria-label="Close">${icon('x')}</button>
  `;
  overlay.querySelector('.lightbox-close').addEventListener('click', overlay._close || (()=>overlay.remove()));
  overlay.querySelector('#cancelEditBtn').addEventListener('click', ()=> renderLightboxView(overlay, id));
  overlay.querySelector('#saveEditBtn').addEventListener('click', ()=>{
    const caption = overlay.querySelector('#editCaptionInput').value.trim();
    const project = overlay.querySelector('#editProjectInput').value;
    const date = overlay.querySelector('#editDateInput').value || p.date;
    p.caption = caption;
    p.project = project;
    p.date = date;
    p.month = toMonthKey(date);
    Store.savePhotos();
    renderPhotosFilters(); renderPhotosGallery();
    renderLightboxView(overlay, id);
    toast('Photo caption updated.', 'ok');
  });
}

/* ---- Upload handling ---- */
function handleFiles(fileList){
  const files = Array.from(fileList).filter(f=>f.type.startsWith('image/'));
  if(files.length===0){ toast('Please choose image files (JPG/PNG).', 'err'); return; }
  const project = document.getElementById('uploadProject').value;
  const date = document.getElementById('uploadDate').value || new Date().toISOString().slice(0,10);
  const captionInput = document.getElementById('uploadCaption');
  const baseCaption = captionInput.value.trim();
  let remaining = files.length;
  files.forEach((file, i)=>{
    compressImage(file, 1400, 0.78).then(dataUrl=>{
      Store.photos.unshift({
        id: 'p' + Date.now() + '-' + i + '-' + Math.random().toString(36).slice(2,7),
        caption: files.length>1 ? (baseCaption ? `${baseCaption} (${i+1})` : file.name.replace(/\.[a-z0-9]+$/i,'')) : (baseCaption || file.name.replace(/\.[a-z0-9]+$/i,'')),
        project, date, month: toMonthKey(date), dataUrl,
      });
    }).catch(()=>{}).finally(()=>{
      remaining--;
      if(remaining===0){
        Store.savePhotos();
        captionInput.value = '';
        renderPhotosFilters(); renderPhotosGallery();
        toast(`${files.length} photo${files.length!==1?'s':''} uploaded and tagged.`, 'ok');
      }
    });
  });
}

function compressImage(file, maxDim, quality){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    const reader = new FileReader();
    reader.onload = e => { img.onload = ()=>{
        let { width, height } = img;
        if(width>maxDim || height>maxDim){
          const scale = maxDim / Math.max(width,height);
          width = Math.round(width*scale); height = Math.round(height*scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img,0,0,width,height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
