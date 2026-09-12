/* ===========================================================
   Import / Export — Excel (.xlsx), JSON backup, PDF executive report
   =========================================================== */

/* ---------------- Excel export ---------------- */
function exportExcel(){
  const rows = Store.records.slice().sort((a,b)=> a.project===b.project ? (a.date<b.date?1:-1) : a.project.localeCompare(b.project));
  const header = EXCEL_COLUMNS.map(c=>c.header);
  const dataRows = rows.map(r=>{
    const monthTxt = monthLabel(r.month);
    const projName = PROJECT_BY_ID[r.project] ? PROJECT_BY_ID[r.project].name : r.project;
    return EXCEL_COLUMNS.map(c=>{
      if(c.key==='month') return monthTxt;
      if(c.key==='date') return r.date;
      if(c.key==='project') return projName;
      return r[c.key] ?? 0;
    });
  });
  const wsData = [header, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = EXCEL_COLUMNS.map(c => ({ wch: Math.max(12, c.header.length+2) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'HSSE Data');

  const projSheet = XLSX.utils.aoa_to_sheet([
    ['Valid Project Names — type these exactly in the Project column above'],
    ...PROJECTS.map(p=>[p.name]),
  ]);
  projSheet['!cols'] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(wb, projSheet, 'Projects');

  const readme = XLSX.utils.aoa_to_sheet([
    ['HSSE Dashboard — Data Workbook'],
    [''],
    ['How to use this file:'],
    ['1. Each row = one project, for one reporting week.'],
    ['2. To add a new week/month, add a NEW row — do not overwrite old rows. This is how the dashboard builds its history/trend charts.'],
    ['3. The "Project" column must exactly match one of the names on the "Projects" sheet.'],
    ['4. The "Week (Report Date)" column should be a date in the same week/report the numbers cover, format YYYY-MM-DD (e.g. 2026-08-14).'],
    ['5. Save this file, then in the dashboard sidebar click "Import" and select this file — all matching rows will update the dashboard automatically.'],
    ['6. You can re-export at any time to get a fresh backup including everything you have imported so far.'],
    [''],
    [`Exported: ${new Date().toLocaleString('en-GB')}`],
  ]);
  readme['!cols'] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, readme, 'ReadMe');

  const fname = `HSSE_Dashboard_Data_${todayStamp()}.xlsx`;
  XLSX.writeFile(wb, fname);
  toast(`Excel file exported: ${fname}`, 'ok');
}

function todayStamp(){
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}

/* ---------------- Excel import ---------------- */
function importExcelFile(file){
  const reader = new FileReader();
  reader.onload = (e)=>{
    try{
      const wb = XLSX.read(e.target.result, { type:'array', cellDates:true });
      const sheetName = wb.SheetNames.find(n=>/hsse.?data/i.test(n)) || wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { defval:'' });
      if(json.length===0){ toast('No data rows found in that sheet.', 'err'); return; }

      const colMap = buildHeaderMap(Object.keys(json[0]));
      let added=0, updated=0, skipped=0;
      const skippedReasons = [];

      json.forEach((row, i)=>{
        const projRaw = row[colMap.project] ?? row['Project'] ?? '';
        const pid = projectNameToId(projRaw);
        if(!pid){ skipped++; skippedReasons.push(`Row ${i+2}: unrecognized project "${projRaw}"`); return; }

        const dateRaw = row[colMap.date] ?? row['Week (Report Date)'] ?? row['Week'] ?? '';
        const date = parseFlexibleDate(dateRaw);
        if(!date){ skipped++; skippedReasons.push(`Row ${i+2}: unrecognized date "${dateRaw}"`); return; }

        const rec = { project: pid, date, month: toMonthKey(date) };
        EXCEL_COLUMNS.forEach(c=>{
          if(['month','date','project'].includes(c.key)) return;
          const raw = row[colMap[c.key]] ?? row[c.header] ?? 0;
          rec[c.key] = Number(raw) || 0;
        });

        const existed = Store.records.some(r=>r.project===pid && r.date===date);
        Store.upsertRecord(rec);
        existed ? updated++ : added++;
      });

      Store.saveRecords();
      refreshAllTabs();
      toast(`Import complete — ${added} added, ${updated} updated${skipped?`, ${skipped} skipped`:''}.`, skipped?'err':'ok');
      if(skippedReasons.length) console.warn('Import skipped rows:\n' + skippedReasons.join('\n'));
    }catch(err){
      console.error(err);
      toast('Could not read that file. Please make sure it is a valid .xlsx exported from this dashboard.', 'err');
    }
  };
  reader.readAsArrayBuffer(file);
}

function buildHeaderMap(headers){
  const map = {};
  EXCEL_COLUMNS.forEach(c=>{
    const hit = headers.find(h => h.trim().toLowerCase()===c.header.trim().toLowerCase());
    if(hit) map[c.key]=hit;
  });
  return map;
}

function parseFlexibleDate(v){
  if(!v && v!==0) return null;
  if(v instanceof Date && !isNaN(v)) return isoFromDate(v);
  const s = String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  let m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/); // DD-MM-YYYY or DD/MM/YYYY
  if(m) return isoFromDate(new Date(Number(m[3]), Number(m[2])-1, Number(m[1])));
  m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if(m) return isoFromDate(new Date(Number(m[1]), Number(m[2])-1, Number(m[3])));
  const d = new Date(s);
  if(!isNaN(d)) return isoFromDate(d);
  return null;
}
function isoFromDate(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ---------------- JSON full backup ---------------- */
function exportJsonBackup(){
  const payload = { type:'hsse-dashboard-backup', version:1, exportedAt:new Date().toISOString(), records: Store.records, photos: Store.photos };
  const blob = new Blob([JSON.stringify(payload)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `HSSE_Dashboard_Backup_${todayStamp()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
  toast('Full backup (data + photos) exported as JSON.', 'ok');
}

function importJsonFile(file){
  const reader = new FileReader();
  reader.onload = (e)=>{
    try{
      const payload = JSON.parse(e.target.result);
      if(!payload || !Array.isArray(payload.records)) throw new Error('bad shape');
      let added=0, updated=0;
      payload.records.forEach(rec=>{
        const existed = Store.records.some(r=>r.project===rec.project && r.date===rec.date);
        Store.upsertRecord(rec);
        existed ? updated++ : added++;
      });
      let photosAdded = 0;
      if(Array.isArray(payload.photos)){
        const existingIds = new Set(Store.photos.map(p=>p.id));
        payload.photos.forEach(p=>{ if(!existingIds.has(p.id)){ Store.photos.push(p); photosAdded++; } });
      }
      Store.saveRecords(); Store.savePhotos();
      refreshAllTabs();
      toast(`Backup restored — ${added} records added, ${updated} updated, ${photosAdded} photos added.`, 'ok');
    }catch(err){
      console.error(err);
      toast('That file is not a valid HSSE Dashboard JSON backup.', 'err');
    }
  };
  reader.readAsText(file);
}

/* ---------------- PDF executive report export ---------------- */
const PDF_SECTIONS = [
  { id:'execSectionKpi',         title:'Company-Wide Snapshot' },
  { id:'execSectionPerformance', title:'Performance by Project' },
  { id:'execSectionIndex',       title:'HSSE Safety Index — Company Average' },
  { id:'execSectionTrend',       title:'Trend Over Time' },
];
const PDF_MARGIN = 40;
const PDF_HEADER_H = 54;
const PDF_FOOTER_H = 26;

function pdfDrawChrome(pdf, pageW, pageH, sectionTitle, pageNum){
  // Header band
  pdf.setFillColor(15, 23, 20);
  pdf.rect(0, 0, pageW, PDF_HEADER_H, 'F');
  pdf.setTextColor(255,255,255);
  pdf.setFontSize(13); pdf.setFont(undefined, 'bold');
  pdf.text('HSSE Executive Summary Report', PDF_MARGIN, 24);
  pdf.setFontSize(9); pdf.setFont(undefined, 'normal'); pdf.setTextColor(180,220,205);
  pdf.text(sectionTitle, PDF_MARGIN, 39);
  pdf.setTextColor(150,150,150); pdf.setFontSize(8);
  pdf.text(new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }), pageW - PDF_MARGIN, 24, { align:'right' });
  // Footer
  pdf.setDrawColor(220,220,220);
  pdf.line(PDF_MARGIN, pageH - PDF_FOOTER_H, pageW - PDF_MARGIN, pageH - PDF_FOOTER_H);
  pdf.setFontSize(8); pdf.setTextColor(140,140,140);
  pdf.text('Rua Al-Haram Al-Makki Co. — Restricted, Client Use Only', PDF_MARGIN, pageH - 12);
  pdf.text(`Page ${pageNum}`, pageW - PDF_MARGIN, pageH - 12, { align:'right' });
}

function pdfCoverPage(pdf, pageW, pageH){
  pdf.setFillColor(11, 18, 16);
  pdf.rect(0, 0, pageW, pageH, 'F');
  if(window.BRAND_LOGO){
    try{
      const w = 130, h = 130 * (140/351);
      pdf.addImage(window.BRAND_LOGO, 'PNG', pageW/2 - w/2, 90, w, h);
    }catch(e){ /* ignore image errors */ }
  }
  pdf.setTextColor(255,255,255);
  pdf.setFontSize(24); pdf.setFont(undefined, 'bold');
  pdf.text('HSSE Executive Summary Report', pageW/2, 210, { align:'center' });
  pdf.setFontSize(11.5); pdf.setFont(undefined, 'normal'); pdf.setTextColor(170,210,195);
  pdf.text('Health, Safety, Security & Environment — Program-Wide Performance', pageW/2, 232, { align:'center' });

  pdf.setDrawColor(60,90,80);
  pdf.line(pageW/2 - 90, 254, pageW/2 + 90, 254);

  const months = Store.distinctMonths().slice().sort();
  const period = months.length ? `${monthLabel(months[0])} – ${monthLabel(months[months.length-1])}` : '—';
  const lines = [
    ['Prepared for', 'Executive Review'],
    ['Reporting period', period],
    ['Projects covered', `${PROJECTS.length} active projects`],
    ['Generated', new Date().toLocaleString('en-GB', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })],
  ];
  let y = 290;
  pdf.setFontSize(10.5);
  lines.forEach(([k,v])=>{
    pdf.setTextColor(140,175,163); pdf.setFont(undefined,'bold');
    pdf.text(k.toUpperCase(), pageW/2 - 140, y);
    pdf.setTextColor(230,235,233); pdf.setFont(undefined,'normal');
    pdf.text(String(v), pageW/2 + 10, y);
    y += 24;
  });

  y += 14;
  pdf.setFontSize(9); pdf.setTextColor(140,175,163); pdf.setFont(undefined,'bold');
  pdf.text('PROJECTS IN THIS REPORT', pageW/2, y, { align:'center' }); y += 16;
  pdf.setFont(undefined,'normal'); pdf.setTextColor(220,225,223); pdf.setFontSize(9.5);
  PROJECTS.forEach(p=>{ pdf.text(`•  ${p.name}`, pageW/2, y, { align:'center' }); y += 15; });

  pdf.setFontSize(8); pdf.setTextColor(120,120,120);
  pdf.text('Restricted — Client', pageW/2, pageH - 30, { align:'center' });
}

async function exportExecutivePdf(){
  const available = PDF_SECTIONS.filter(s=>document.getElementById(s.id));
  if(!available.length){ toast('Nothing to export.', 'err'); return; }
  toast('Generating executive PDF report…', 'ok');
  try{
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation:'p', unit:'pt', format:'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const contentW = pageW - PDF_MARGIN*2;
    const contentTop = PDF_HEADER_H + 18;
    const contentH = pageH - contentTop - PDF_FOOTER_H - 10;

    pdfCoverPage(pdf, pageW, pageH);

    let pageNum = 2;
    for(const section of available){
      const el = document.getElementById(section.id);
      const canvas = await html2canvas(el, { backgroundColor: cssVar('--page-plane'), scale: 2, useCORS:true });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgW = contentW;
      const imgH = imgW * canvas.height / canvas.width;

      pdf.addPage();
      pdfDrawChrome(pdf, pageW, pageH, section.title, pageNum++);

      if(imgH <= contentH){
        pdf.addImage(imgData, 'JPEG', PDF_MARGIN, contentTop, imgW, imgH, '', 'FAST');
      }else{
        // Section taller than one page: crop the source canvas into page-sized pixel slices
        // (rather than repositioning one image, which would bleed into the header/footer chrome).
        const pxPerPt = canvas.width / imgW;
        const contentHPx = Math.floor(contentH * pxPerPt);
        let renderedPx = 0;
        let firstPage = true;
        while(renderedPx < canvas.height){
          if(!firstPage){
            pdf.addPage();
            pdfDrawChrome(pdf, pageW, pageH, section.title + ' (cont.)', pageNum++);
          }
          const sliceHPx = Math.min(contentHPx, canvas.height - renderedPx);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceHPx;
          sliceCanvas.getContext('2d').drawImage(canvas, 0, renderedPx, canvas.width, sliceHPx, 0, 0, canvas.width, sliceHPx);
          const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
          const sliceHPt = sliceHPx / pxPerPt;
          pdf.addImage(sliceData, 'JPEG', PDF_MARGIN, contentTop, imgW, sliceHPt, '', 'FAST');
          renderedPx += sliceHPx;
          firstPage = false;
        }
      }
    }

    pdf.save(`HSSE_Executive_Report_${todayStamp()}.pdf`);
    toast('Executive PDF report downloaded.', 'ok');
  }catch(err){
    console.error(err);
    toast('PDF export failed — you can also use your browser Print (Ctrl/Cmd+P) on this tab.', 'err');
  }
}

/* ===========================================================
   NARRATIVE EXECUTIVE ANALYSIS REPORT
   A genuine, data-driven written report (not a dashboard screenshot) —
   overall status & analysis, per-project analysis with gaps, and
   consolidated recommendations for CEO/CFO decision-making.
   =========================================================== */

/* ---------- 1. Rules-based analysis engine (pure data → findings) ---------- */
function computeExecutiveAnalysis(){
  const snapshot = Store.snapshotForExecutive('all'); // latest record per reporting project
  const agg = aggregateSnapshot(snapshot);
  const months = Store.distinctMonths().slice().sort();
  const multiPeriod = months.length > 1;

  const missingProjects = PROJECTS.filter(p => !snapshot.find(r=>r.project===p.id));
  const incidentProjects = snapshot.filter(r => Number(r.fatality)>0 || Number(r.lti)>0);
  const rdiProjects = snapshot.filter(r => Number(r.rdi)>0 && !(Number(r.fatality)>0||Number(r.lti)>0));
  const envProjects = snapshot.filter(r => Number(r.environmentIncidents)>0);
  const openNcrProjects = snapshot.filter(r => Number(r.ncrOpen)>0);
  const zeroIndexProjects = snapshot.filter(r => INDEX_FIELDS.every(f => Number(r[f.key+'Conducted'])===0));
  const partialIndexProjects = snapshot.filter(r => {
    const zeros = INDEX_FIELDS.filter(f => Number(r[f.key+'Conducted'])===0).length;
    return zeros>0 && zeros<INDEX_FIELDS.length;
  });
  const zeroEngagementProjects = snapshot.filter(r => Number(r.rewardsRecognitions)===0);

  const byExposure = snapshot.slice().sort((a,b)=>Number(b.workedManHours)-Number(a.workedManHours));
  const highestExposure = byExposure[0] || null;

  let hoursTrendPct = null, trirDelta = null, periodLabel = '';
  if(multiPeriod){
    const first = months[0], last = months[months.length-1];
    const hoursFirst = Store.records.filter(r=>r.month===first).reduce((s,r)=>s+Number(r.workedManHours||0),0);
    const hoursLast  = Store.records.filter(r=>r.month===last).reduce((s,r)=>s+Number(r.workedManHours||0),0);
    if(hoursFirst>0) hoursTrendPct = Math.round(((hoursLast-hoursFirst)/hoursFirst)*100);
    const trirAgg = (m)=>{
      const rs = Store.records.filter(r=>r.month===m && Number(r.workedManHours)>0);
      const totalH = rs.reduce((s,r)=>s+Number(r.workedManHours),0) || 1;
      return rs.reduce((s,r)=>s+Number(r.trir||0)*Number(r.workedManHours),0)/totalH;
    };
    trirDelta = +(trirAgg(last) - trirAgg(first)).toFixed(2);
    periodLabel = `${monthLabel(first)} – ${monthLabel(last)}`;
  } else if(months.length===1){
    periodLabel = monthLabel(months[0]);
  }

  const projectAnalyses = PROJECTS.map(p => {
    const rec = snapshot.find(r=>r.project===p.id) || null;
    if(!rec) return { project:p, hasData:false };
    const status = projectStatusOf(rec);
    const gaps = buildProjectGaps(rec);
    const narrative = buildProjectNarrative(p, rec);
    return { project:p, hasData:true, rec, status, gaps, narrative };
  });

  const recommendations = buildRecommendations({
    snapshot, incidentProjects, rdiProjects, envProjects, openNcrProjects,
    zeroIndexProjects, partialIndexProjects, zeroEngagementProjects, missingProjects,
  });

  return {
    snapshot, agg, months, multiPeriod, periodLabel, hoursTrendPct, trirDelta,
    missingProjects, incidentProjects, rdiProjects, envProjects, openNcrProjects,
    zeroIndexProjects, partialIndexProjects, zeroEngagementProjects, highestExposure,
    projectAnalyses, recommendations,
  };
}

function projectStatusOf(rec){
  if(Number(rec.fatality)>0 || Number(rec.lti)>0) return { label:'CRITICAL', color:[188,56,56] };
  const zeros = INDEX_FIELDS.filter(f=>Number(rec[f.key+'Conducted'])===0).length;
  if(Number(rec.rdi)>0 || Number(rec.ncrOpen)>0 || zeros===INDEX_FIELDS.length || Number(rec.environmentIncidents)>0){
    return { label:'NEEDS ATTENTION', color:[196,142,36] };
  }
  return { label:'ON TRACK', color:[54,142,92] };
}

function buildProjectGaps(rec){
  const gaps = [];
  const zeroFields = INDEX_FIELDS.filter(f=>Number(rec[f.key+'Conducted'])===0);
  if(zeroFields.length===INDEX_FIELDS.length){
    gaps.push('No HSSE Index assessments (PSI / ASI / ESI / WSI / SSI) conducted this period.');
  }else if(zeroFields.length>0){
    gaps.push(`Partial index coverage — no assessments yet for: ${zeroFields.map(f=>f.label).join(', ')}.`);
  }
  if(Number(rec.fatality)>0) gaps.push(`${fmtInt(rec.fatality)} fatality event(s) — requires formal investigation and CEO-level notification.`);
  if(Number(rec.lti)>0) gaps.push(`${fmtInt(rec.lti)} lost-time injury event(s) — requires formal investigation and closure tracking.`);
  if(Number(rec.rdi)>0) gaps.push(`${fmtInt(rec.rdi)} restricted-duty incident(s) recorded — root-cause review recommended.`);
  if(Number(rec.ncrOpen)>0) gaps.push(`${fmtInt(rec.ncrOpen)} open Non-Conformance Report(s) pending closure (${fmtInt(rec.ncrClosed)} closed to date).`);
  if(Number(rec.environmentIncidents)>0) gaps.push(`${fmtInt(rec.environmentIncidents)} environmental incident(s) recorded this period.`);
  if(Number(rec.rewardsRecognitions)===0) gaps.push('No rewards/recognitions logged — engagement/recognition activity may need reinforcement.');
  if(gaps.length===0) gaps.push('No material gaps identified this period — project is performing within expected HSSE parameters.');
  return gaps;
}

function buildProjectNarrative(p, rec){
  const parts = [];
  parts.push(`${p.name} logged ${fmtInt(rec.workedManHours)} worked man-hours for the week of ${fmtDate(rec.date)}, supported by an average workforce of ${fmtInt(rec.manpowerAvg)} personnel, including ${fmtInt(rec.hsseStaffAvg)} dedicated HSSE staff and ${fmtInt(rec.securityStaffAvg)} security staff.`);

  if(Number(rec.fatality)>0 || Number(rec.lti)>0){
    const bits = [];
    if(Number(rec.fatality)>0) bits.push(`${fmtInt(rec.fatality)} fatality event(s)`);
    if(Number(rec.lti)>0) bits.push(`${fmtInt(rec.lti)} lost-time injury event(s)`);
    parts.push(`This period recorded ${bits.join(' and ')}, which requires immediate executive attention, a formal incident investigation, and confirmation of corrective actions before the next reporting cycle.`);
  }else if(Number(rec.rdi)>0){
    parts.push(`No fatalities or lost-time injuries were recorded, though ${fmtInt(rec.rdi)} restricted-duty/first-aid-plus incident(s) occurred and should be reviewed for root cause.`);
  }else{
    parts.push(`No fatalities, lost-time injuries or restricted-duty incidents were recorded this period.`);
  }

  const hasRateActivity = Number(rec.fr)>0 || Number(rec.ltifr)>0 || Number(rec.trir)>0;
  parts.push(`Frequency indicators stand at FR ${fmtRate(rec.fr)}, LTIFR ${fmtRate(rec.ltifr)} and TRIR ${fmtRate(rec.trir)}${hasRateActivity ? ', reflecting recordable-incident activity that should be tracked closely against the portfolio baseline.' : ', consistent with a zero-recordable-incident record for the period.'}`);

  parts.push(`Leading-indicator engagement included ${fmtInt(rec.nearMiss)} near-miss reports, ${fmtInt(rec.firstAid)} first-aid cases, ${fmtInt(rec.weeklyTbtMeeting)} toolbox-talk sessions, ${fmtInt(rec.managementWalkthrough)} management walkthroughs and ${fmtInt(rec.emergencyDrills)} emergency drills.`);

  const zeros = INDEX_FIELDS.filter(f=>Number(rec[f.key+'Conducted'])===0);
  if(zeros.length===INDEX_FIELDS.length){
    parts.push(`No formal HSSE Index assessments were conducted for this project during the period, leaving a visibility gap for executive benchmarking.`);
  }else if(zeros.length>0){
    parts.push(`${zeros.length} of 5 HSSE Index categories (${zeros.map(f=>f.label).join(', ')}) had no assessments conducted this period.`);
  }else{
    const avgScore = Math.round(INDEX_FIELDS.reduce((s,f)=>s+Number(rec[f.key+'Score']),0)/INDEX_FIELDS.length);
    parts.push(`All 5 HSSE Index categories were assessed this period, averaging ${avgScore}% across PSI, ASI, ESI, WSI and SSI.`);
  }

  if(Number(rec.ncrOpen)>0){
    parts.push(`${fmtInt(rec.ncrOpen)} Non-Conformance Report(s) remain open against ${fmtInt(rec.ncrClosed)} closed, indicating outstanding corrective actions that require follow-up.`);
  }else if(Number(rec.ncrClosed)>0){
    parts.push(`All ${fmtInt(rec.ncrClosed)} Non-Conformance Report(s) logged this period have been closed, with no open items outstanding.`);
  }

  return parts.join(' ');
}

function buildOverallNarrative(a){
  const paras = [];
  paras.push(`Across the ${a.snapshot.length} of ${PROJECTS.length} active projects currently reporting${a.periodLabel ? ` (${a.periodLabel})` : ''}, the portfolio logged a combined ${fmtInt(a.agg.workedManHours)} worked man-hours and an average on-site workforce of ${fmtInt(a.agg.manpowerAvg)}, supported by ${fmtInt(a.agg.hsseStaffAvg)} dedicated HSSE personnel and ${fmtInt(a.agg.securityStaffAvg)} security staff.`);

  if(a.incidentProjects.length>0){
    paras.push(`${a.incidentProjects.length} project(s) — ${a.incidentProjects.map(r=>PROJECT_BY_ID[r.project].short).join(', ')} — recorded a fatality and/or lost-time injury this period. These are addressed individually in Section 2 and require immediate executive follow-up.`);
  }else{
    paras.push(`No fatalities or lost-time injuries were recorded on any active project this period. Portfolio-wide, hours-weighted frequency indicators stand at FR ${fmtRate(a.agg.fr)}, LTIFR ${fmtRate(a.agg.ltifr)} and TRIR ${fmtRate(a.agg.trir)}.`);
  }

  if(a.highestExposure){
    const share = a.agg.workedManHours>0 ? Math.round(Number(a.highestExposure.workedManHours)/a.agg.workedManHours*100) : 0;
    paras.push(`${PROJECT_BY_ID[a.highestExposure.project].name} carries the largest share of portfolio exposure at ${fmtInt(a.highestExposure.workedManHours)} worked man-hours (${share}% of the total) and warrants proportionate HSSE resourcing and oversight.`);
  }

  if(a.zeroIndexProjects.length>0){
    paras.push(`${a.zeroIndexProjects.length} project(s) — ${a.zeroIndexProjects.map(r=>PROJECT_BY_ID[r.project].short).join(', ')} — reported no HSSE Index assessments (PSI/ASI/ESI/WSI/SSI) this period. This is the most significant visibility gap in the current reporting cycle and limits the ability to benchmark safety maturity consistently across the portfolio.`);
  }
  if(a.partialIndexProjects.length>0){
    paras.push(`A further ${a.partialIndexProjects.length} project(s) — ${a.partialIndexProjects.map(r=>PROJECT_BY_ID[r.project].short).join(', ')} — have partial index coverage, with one or more categories not yet assessed this period.`);
  }
  if(a.zeroIndexProjects.length===0 && a.partialIndexProjects.length===0){
    paras.push(`All reporting projects have at least partial HSSE Index coverage this period, supporting consistent safety-maturity benchmarking across the portfolio.`);
  }

  if(a.openNcrProjects.length>0){
    const totalOpen = a.openNcrProjects.reduce((s,r)=>s+Number(r.ncrOpen),0);
    paras.push(`${fmtInt(totalOpen)} Non-Conformance Report(s) remain open across ${a.openNcrProjects.length} project(s) (${a.openNcrProjects.map(r=>PROJECT_BY_ID[r.project].short).join(', ')}), representing outstanding corrective actions that should be tracked to closure.`);
  }else{
    paras.push(`No open Non-Conformance Reports remain across the portfolio at this time.`);
  }

  if(a.missingProjects.length>0){
    paras.push(`${a.missingProjects.map(p=>p.name).join(', ')} ${a.missingProjects.length>1?'have':'has'} not yet submitted data for this reporting cycle and ${a.missingProjects.length>1?'are':'is'} excluded from the totals above.`);
  }

  if(a.multiPeriod){
    const trend = a.hoursTrendPct===null ? '' : (a.hoursTrendPct>0 ? `up ${a.hoursTrendPct}%` : (a.hoursTrendPct<0 ? `down ${Math.abs(a.hoursTrendPct)}%` : 'flat'));
    const trirMove = a.trirDelta===null ? '' : (a.trirDelta>0 ? `increased by ${a.trirDelta}` : (a.trirDelta<0 ? `improved by ${Math.abs(a.trirDelta)}` : 'held steady'));
    paras.push(`With ${a.months.length} reporting periods now on file (${a.periodLabel}), worked man-hours moved ${trend} and company-wide TRIR ${trirMove} across the same window. Continued monthly data submission will further strengthen month-over-month trend confidence.`);
  }else{
    paras.push(`This report is based on a single reporting period (${a.periodLabel}); month-over-month trend analysis will become available once further weekly/monthly data is imported via the Excel workbook.`);
  }

  return paras;
}

function buildRecommendations(a){
  const recs = [];
  if(a.incidentProjects.length>0){
    recs.push(`Commission a formal incident investigation for ${a.incidentProjects.map(r=>PROJECT_BY_ID[r.project].short).join(', ')}, and present root-cause findings with corrective-action timelines at the next executive review.`);
  }
  if(a.zeroIndexProjects.length>0){
    recs.push(`Mandate HSSE Index assessments (PSI/ASI/ESI/WSI/SSI) for ${a.zeroIndexProjects.map(r=>PROJECT_BY_ID[r.project].short).join(', ')} before the next reporting cycle to close the current visibility gap.`);
  }
  if(a.partialIndexProjects.length>0){
    recs.push(`Complete the outstanding index categories on ${a.partialIndexProjects.map(r=>PROJECT_BY_ID[r.project].short).join(', ')} to bring all active projects to full 5-index coverage.`);
  }
  if(a.openNcrProjects.length>0){
    recs.push(`Set a target closure date and accountable owner for all open NCRs (currently ${a.openNcrProjects.reduce((s,r)=>s+Number(r.ncrOpen),0)} open across ${a.openNcrProjects.length} project(s)).`);
  }
  if(a.rdiProjects.length>0){
    recs.push(`Review restricted-duty incident cases on ${a.rdiProjects.map(r=>PROJECT_BY_ID[r.project].short).join(', ')} to confirm fitness-for-duty and return-to-work protocols are being followed.`);
  }
  if(a.envProjects.length>0){
    recs.push(`Investigate the environmental incident(s) on ${a.envProjects.map(r=>PROJECT_BY_ID[r.project].short).join(', ')} and confirm mitigation measures are in place.`);
  }
  if(a.zeroEngagementProjects.length>0){
    recs.push(`Reinforce the rewards/recognition program on ${a.zeroEngagementProjects.map(r=>PROJECT_BY_ID[r.project].short).join(', ')}, where no recognitions were logged this period.`);
  }
  if(a.missingProjects.length>0){
    recs.push(`Follow up with ${a.missingProjects.map(p=>p.name).join(', ')} to ensure timely HSSE data submission ahead of the next executive cycle.`);
  }
  recs.push(`Continue routine weekly/monthly data submission via the Excel workbook so trend and month-over-month comparisons continue to strengthen future executive cycles.`);
  if(recs.length===1){
    recs.unshift(`Maintain current HSSE practices across the portfolio — no critical or high-priority gaps were identified this period.`);
  }
  return recs;
}

/* ---------- 2. PDF layout engine (jsPDF native text — no dashboard screenshots) ---------- */
const AR_MARGIN = 46;
const AR_HEADER_H = 50;
const AR_FOOTER_H = 26;

function arChrome(pdf, pageW, pageH, sectionTitle, pageNum){
  pdf.setFillColor(15, 23, 20);
  pdf.rect(0, 0, pageW, AR_HEADER_H, 'F');
  pdf.setTextColor(255,255,255);
  pdf.setFontSize(12.5); pdf.setFont(undefined, 'bold');
  pdf.text('HSSE Executive Analysis Report', AR_MARGIN, 22);
  pdf.setFontSize(8.5); pdf.setFont(undefined, 'normal'); pdf.setTextColor(180,220,205);
  pdf.text(sectionTitle, AR_MARGIN, 36);
  pdf.setTextColor(150,150,150); pdf.setFontSize(8);
  pdf.text(new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }), pageW - AR_MARGIN, 22, { align:'right' });
  pdf.setDrawColor(220,220,220);
  pdf.line(AR_MARGIN, pageH - AR_FOOTER_H, pageW - AR_MARGIN, pageH - AR_FOOTER_H);
  pdf.setFontSize(8); pdf.setTextColor(140,140,140);
  pdf.text('Rua Al-Haram Al-Makki Co. — Restricted, Executive Use Only', AR_MARGIN, pageH - 12);
  pdf.text(`Page ${pageNum}`, pageW - AR_MARGIN, pageH - 12, { align:'right' });
}

function arCoverPage(pdf, pageW, pageH, analysis){
  pdf.setFillColor(11, 18, 16);
  pdf.rect(0, 0, pageW, pageH, 'F');
  if(window.BRAND_LOGO){
    try{ const w = 120, h = 120 * (140/351); pdf.addImage(window.BRAND_LOGO, 'PNG', pageW/2 - w/2, 78, w, h); }catch(e){}
  }
  pdf.setTextColor(255,255,255);
  pdf.setFontSize(23); pdf.setFont(undefined, 'bold');
  pdf.text('HSSE Executive Analysis Report', pageW/2, 200, { align:'center' });
  pdf.setFontSize(11); pdf.setFont(undefined, 'normal'); pdf.setTextColor(170,210,195);
  pdf.text('Prepared for Senior Management, CEO & CFO — Decision Support', pageW/2, 221, { align:'center' });

  pdf.setDrawColor(60,90,80);
  pdf.line(pageW/2 - 90, 240, pageW/2 + 90, 240);

  const lines = [
    ['Reporting period', analysis.periodLabel || '—'],
    ['Projects covered', `${analysis.snapshot.length} of ${PROJECTS.length} active projects`],
    ['Report contents', 'Overall status · Per-project analysis · Recommendations'],
    ['Generated', new Date().toLocaleString('en-GB', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })],
  ];
  let y = 276;
  pdf.setFontSize(10);
  lines.forEach(([k,v])=>{
    pdf.setTextColor(140,175,163); pdf.setFont(undefined,'bold');
    pdf.text(k.toUpperCase(), pageW/2 - 150, y);
    pdf.setTextColor(230,235,233); pdf.setFont(undefined,'normal');
    const wrapped = pdf.splitTextToSize(String(v), 210);
    pdf.text(wrapped, pageW/2 + 5, y);
    y += 20 + (wrapped.length-1)*13;
  });

  y += 16;
  pdf.setFontSize(9); pdf.setTextColor(140,175,163); pdf.setFont(undefined,'bold');
  pdf.text('PROJECTS IN THIS REPORT', pageW/2, y, { align:'center' }); y += 16;
  pdf.setFont(undefined,'normal'); pdf.setTextColor(220,225,223); pdf.setFontSize(9.5);
  PROJECTS.forEach(p=>{
    const st = analysis.projectAnalyses.find(pa=>pa.project.id===p.id);
    const tag = st && st.hasData ? st.status.label : 'NO DATA';
    pdf.text(`•  ${p.name}  —  ${tag}`, pageW/2, y, { align:'center' }); y += 14.5;
  });

  pdf.setFontSize(8); pdf.setTextColor(120,120,120);
  pdf.text('Restricted — Executive Distribution Only', pageW/2, pageH - 30, { align:'center' });
}

async function exportExecutiveAnalysisReport(){
  toast('Generating executive analysis report…', 'ok');
  try{
    const analysis = computeExecutiveAnalysis();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation:'p', unit:'pt', format:'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const contentX = AR_MARGIN;
    const contentW = pageW - AR_MARGIN*2;
    const contentTop = AR_HEADER_H + 26;
    const contentBottom = pageH - AR_FOOTER_H - 12;

    let pageNum = 2, sectionTitle = '', y = contentTop;
    const newPage = (title)=>{
      pdf.addPage();
      sectionTitle = title;
      arChrome(pdf, pageW, pageH, sectionTitle, pageNum++);
      y = contentTop;
    };
    const ensure = (h)=>{ if(y + h > contentBottom) newPage(sectionTitle + ' (cont.)'); };

    const heading = (text, size=13.5)=>{
      ensure(size + 14);
      pdf.setFont(undefined,'bold'); pdf.setFontSize(size); pdf.setTextColor(20,26,24);
      pdf.text(text, contentX, y); y += size + 8;
      pdf.setDrawColor(210,214,212); pdf.line(contentX, y-6, pageW-AR_MARGIN, y-6);
    };
    const subheading = (text, color=[20,26,24])=>{
      ensure(22);
      pdf.setFont(undefined,'bold'); pdf.setFontSize(11.5); pdf.setTextColor(...color);
      pdf.text(text, contentX, y); y += 16;
    };
    const paragraph = (text, opts={})=>{
      pdf.setFont(undefined, opts.bold?'bold':'normal');
      pdf.setFontSize(opts.size || 9.7);
      pdf.setTextColor(...(opts.color || [64,70,68]));
      const lines = pdf.splitTextToSize(text, opts.width || contentW);
      const lh = (opts.size||9.7) * 1.5;
      lines.forEach(line=>{ ensure(lh); pdf.text(line, opts.x || contentX, y); y += lh; });
      y += opts.gapAfter ?? 6;
    };
    const bullet = (text, color=[64,70,68])=>{
      pdf.setFont(undefined,'normal'); pdf.setFontSize(9.5); pdf.setTextColor(...color);
      const lines = pdf.splitTextToSize(text, contentW - 14);
      const lh = 13.5;
      ensure(lh * lines.length + 2);
      pdf.setFillColor(...color); pdf.circle(contentX + 3, y - 3.2, 1.6, 'F');
      lines.forEach((line,i)=>{ pdf.text(line, contentX + 12, y); y += lh; });
      y += 2;
    };
    const kpiRow = (cells)=>{
      const gap = 10;
      const colW = (contentW - gap*(cells.length-1)) / cells.length;
      pdf.setFont(undefined,'normal'); pdf.setFontSize(7.3);
      const labelLines = cells.map(c => pdf.splitTextToSize(c.label, colW));
      const maxLabelLines = Math.max(...labelLines.map(l=>l.length));
      const rowH = 16 + maxLabelLines*9 + 6;
      ensure(rowH);
      cells.forEach((c,i)=>{
        const cx = contentX + i*(colW+gap);
        pdf.setFont(undefined,'bold'); pdf.setFontSize(12.5); pdf.setTextColor(20,26,24);
        pdf.text(String(c.value), cx, y);
        pdf.setFont(undefined,'normal'); pdf.setFontSize(7.3); pdf.setTextColor(120,128,124);
        pdf.text(labelLines[i], cx, y + 12);
      });
      y += rowH;
    };

    /* ---- Cover ---- */
    arCoverPage(pdf, pageW, pageH, analysis);

    /* ---- Section 1: Overall status & analysis ---- */
    newPage('1. Overall Program Status & Analysis');
    heading('1. Overall Program Status & Analysis');
    kpiRow([
      { value: fmtInt(analysis.agg.workedManHours), label:'WORKED MAN-HOURS' },
      { value: fmtRate(analysis.agg.trir), label:'TRIR (WEIGHTED AVG)' },
      { value: fmtInt(analysis.incidentProjects.length), label:'PROJECTS W/ FATALITY OR LTI' },
      { value: fmtInt(analysis.openNcrProjects.reduce((s,r)=>s+Number(r.ncrOpen),0)), label:'OPEN NCRs (PORTFOLIO)' },
      { value: `${analysis.snapshot.length}/${PROJECTS.length}`, label:'PROJECTS REPORTING' },
    ]);
    buildOverallNarrative(analysis).forEach(p => paragraph(p, { gapAfter: 8 }));
    subheading('Key Overall Findings');
    const overallFindings = [];
    if(analysis.incidentProjects.length>0) overallFindings.push(`Fatality/LTI recorded on: ${analysis.incidentProjects.map(r=>PROJECT_BY_ID[r.project].short).join(', ')}.`);
    if(analysis.zeroIndexProjects.length>0) overallFindings.push(`No HSSE Index assessments this period: ${analysis.zeroIndexProjects.map(r=>PROJECT_BY_ID[r.project].short).join(', ')}.`);
    if(analysis.openNcrProjects.length>0) overallFindings.push(`Open NCRs outstanding on: ${analysis.openNcrProjects.map(r=>PROJECT_BY_ID[r.project].short).join(', ')}.`);
    if(analysis.missingProjects.length>0) overallFindings.push(`No data submitted this cycle: ${analysis.missingProjects.map(p=>p.name).join(', ')}.`);
    if(overallFindings.length===0) overallFindings.push('No critical or high-priority findings at the portfolio level this period.');
    overallFindings.forEach(f=>bullet(f));

    /* ---- Section 2: Per-project analysis ---- */
    newPage('2. Project-by-Project Analysis');
    heading('2. Project-by-Project Analysis');
    analysis.projectAnalyses.forEach(pa=>{
      ensure(60);
      const color = pa.hasData ? pa.status.color : [140,140,140];
      pdf.setFillColor(...color); pdf.roundedRect(contentX, y-10, 8, 8, 1.5, 1.5, 'F');
      pdf.setFont(undefined,'bold'); pdf.setFontSize(11.5); pdf.setTextColor(20,26,24);
      pdf.text(pa.project.name, contentX + 14, y);
      const tag = pa.hasData ? pa.status.label : 'NO DATA SUBMITTED';
      pdf.setFont(undefined,'bold'); pdf.setFontSize(8.5); pdf.setTextColor(...color);
      pdf.text(tag, pageW - AR_MARGIN, y, { align:'right' });
      y += 15;
      if(!pa.hasData){
        paragraph(`${pa.project.name} has not submitted HSSE data for the current reporting cycle. It is excluded from the portfolio totals in Section 1 and should be followed up ahead of the next executive review.`, { gapAfter: 14 });
        return;
      }
      pdf.setFont(undefined,'normal'); pdf.setFontSize(8.3); pdf.setTextColor(120,128,124);
      pdf.text(`Reporting week of ${fmtDate(pa.rec.date)}  ·  ${monthLabel(pa.rec.month)}  ·  ${fmtInt(pa.rec.manpowerAvg)} avg. manpower`, contentX + 14, y);
      y += 14;
      paragraph(pa.narrative, { gapAfter: 6 });
      pdf.setFont(undefined,'bold'); pdf.setFontSize(9); pdf.setTextColor(90,96,94);
      ensure(13); pdf.text('Gaps Identified:', contentX, y); y += 13;
      pa.gaps.forEach(g=>bullet(g, [90,96,94]));
      y += 8;
    });

    /* ---- Section 3: Recommendations ---- */
    newPage('3. Recommendations & Decision Points');
    heading('3. Recommendations & Decision Points for Executive Action');
    paragraph('The following recommendations are derived directly from the findings above and are intended to support CEO/CFO-level decision-making on resourcing, risk mitigation and process enforcement across the portfolio.', { gapAfter:10 });
    analysis.recommendations.forEach((r,i)=>{
      ensure(20);
      pdf.setFont(undefined,'bold'); pdf.setFontSize(9.5); pdf.setTextColor(30,90,70);
      pdf.text(`${i+1}.`, contentX, y);
      const lines = pdf.splitTextToSize(r, contentW - 18);
      pdf.setFont(undefined,'normal'); pdf.setTextColor(64,70,68);
      lines.forEach((line,li)=>{ if(li>0) ensure(13.5); pdf.text(line, contentX + 16, y); y += 13.5; });
      y += 5;
    });
    y += 6;
    subheading('Conclusion');
    const concludeText = (analysis.incidentProjects.length>0 || analysis.zeroIndexProjects.length>0 || analysis.openNcrProjects.length>0)
      ? 'The portfolio shows generally active HSSE engagement, but the findings above identify specific, addressable gaps. Executive sponsorship of the recommendations in this section will materially reduce residual risk ahead of the next reporting cycle.'
      : 'The portfolio is performing within expected HSSE parameters this period, with no critical gaps identified. Continued monthly data submission is recommended to sustain visibility and trend confidence.';
    paragraph(concludeText, { gapAfter: 0 });

    pdf.save(`HSSE_Executive_Analysis_Report_${todayStamp()}.pdf`);
    toast('Executive analysis report downloaded.', 'ok');
  }catch(err){
    console.error(err);
    toast('Report generation failed — please try again.', 'err');
  }
}
