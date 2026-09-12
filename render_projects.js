/* ===========================================================
   Projects (Filter by Project) tab
   =========================================================== */
function renderProjectPicker(){
  const host = document.getElementById('projectPicker');
  if(!host) return;
  host.innerHTML = PROJECTS.map(p=>{
    const active = Store.filters.project===p.id;
    const color = cssVar(p.colorVar);
    return `<button class="chip ${active?'active':''}" data-project="${p.id}"
        style="${active?`background:${color};`:''}">
      <span class="dot" style="background:${color}"></span>${p.short}
    </button>`;
  }).join('');
  host.querySelectorAll('.chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      Store.filters.project = btn.dataset.project;
      Store.filters.projMonth = 'all';
      Store.filters.projWeek = 'all';
      renderProjectsTab();
    });
  });
}

function renderProjectFilters(){
  const pid = Store.filters.project;
  const monthSel = document.getElementById('projMonthFilter');
  const weekSel = document.getElementById('projWeekFilter');
  const months = Store.distinctMonthsForProject(pid);
  if(monthSel){
    monthSel.innerHTML = `<option value="all">All Months (Latest)</option>` + months.map(m=>`<option value="${m}">${monthLabel(m)}</option>`).join('');
    monthSel.value = months.includes(Store.filters.projMonth) ? Store.filters.projMonth : 'all';
    Store.filters.projMonth = monthSel.value;
  }
  const dates = Store.distinctDatesForProject(pid, Store.filters.projMonth);
  if(weekSel){
    weekSel.innerHTML = `<option value="all">Latest Available</option>` + dates.map(d=>`<option value="${d}">Week of ${fmtDate(d)}</option>`).join('');
    weekSel.value = dates.includes(Store.filters.projWeek) ? Store.filters.projWeek : 'all';
    Store.filters.projWeek = weekSel.value;
  }
}

function currentProjectRecord(){
  const pid = Store.filters.project;
  const dates = Store.distinctDatesForProject(pid, Store.filters.projMonth);
  const targetDate = (Store.filters.projWeek!=='all' && dates.includes(Store.filters.projWeek)) ? Store.filters.projWeek : dates[0];
  return Store.records.find(r=>r.project===pid && r.date===targetDate) || null;
}

function renderProjectsTab(){
  renderProjectPicker();
  renderProjectFilters();
  const pid = Store.filters.project;
  const proj = PROJECT_BY_ID[pid];
  const rec = currentProjectRecord();
  const color = cssVar(proj.colorVar);

  const banner = document.getElementById('projectBanner');
  if(banner){
    banner.innerHTML = `
      <div class="pb-left">
        <div class="pb-swatch" style="background:${color}">${icon(proj.icon)}</div>
        <div>
          <h2>${proj.name}</h2>
          <div class="pb-meta">${rec ? `Reporting week of ${fmtDate(rec.date)} · ${monthLabel(rec.month)}` : 'No data logged yet for this project'}</div>
        </div>
      </div>
    `;
  }

  const grid = document.getElementById('projectKpiGrid');
  const empty = document.getElementById('projectEmptyState');
  const body = document.getElementById('projectBody');
  if(!rec){
    if(body) body.classList.add('hidden');
    if(empty) empty.classList.remove('hidden');
    return;
  }
  if(body) body.classList.remove('hidden');
  if(empty) empty.classList.add('hidden');

  if(grid){
    const group = (label, tilesHtml, colsClass='cols-4') => `
      <div class="kpi-group">
        <div class="kpi-group-label">${label}</div>
        <div class="kpi-grid ${colsClass}">${tilesHtml}</div>
      </div>`;

    const groupExposure = [
      kpiTile('clock','Worked Man Hours', fmtInt(rec.workedManHours)),
      kpiTile('userClock','Safe Manhours', fmtInt(rec.safeManhours), null,'good'),
      frTile(rec),
    ].join('');

    const groupWorkforce = [
      kpiTile('users','Manpower (Avg)', fmtInt(rec.manpowerAvg)),
      kpiTile('hardhat','HSSE Staff (Avg)', fmtInt(rec.hsseStaffAvg)),
      kpiTile('shield','Security Staff (Avg)', fmtInt(rec.securityStaffAvg)),
      kpiTile('bell','HSSE Alerts', fmtInt(rec.hsseAlerts)),
    ].join('');

    const groupEngagement = [
      kpiTile('users','Safety Oriented Employees', fmtInt(rec.safetyOrientedEmployees)),
      kpiTile('users','Weekly TBT Meeting', fmtInt(rec.weeklyTbtMeeting)),
      kpiTile('award','Rewards & Recognitions', fmtInt(rec.rewardsRecognitions)),
    ].join('');

    const groupIndexTraining = [
      indexTableTile(rec),
      kpiTile('graduationCap','Specific HSSE Training', fmtInt(rec.specificHsseTraining)),
      kpiTile('footprints','Management Walkthrough', fmtInt(rec.managementWalkthrough)),
    ].join('');

    const groupOutreach = [
      kpiTile('flame','Emergency Drills', fmtInt(rec.emergencyDrills)),
      kpiTile('graduationCap','External HSSE Training', fmtInt(rec.externalHsseTraining)),
      kpiTile('handshake','Coordination Meeting', fmtInt(rec.coordinationMeeting)),
      kpiTile('megaphone','HSSE Campaign', fmtInt(rec.hsseCampaign)),
    ].join('');

    const leftHtml = [
      group('Exposure &amp; Frequency Rates', groupExposure),
      group('Workforce &amp; Alerts', groupWorkforce),
      group('Engagement &amp; Recognition', groupEngagement, 'cols-3'),
      group('Safety Index &amp; Training', groupIndexTraining),
      group('Coordination &amp; Awareness', groupOutreach),
    ].join('');

    const incidentTiles = INCIDENT_FIELDS.map(f=>{
      if(f.key==='ncr') return kpiTile('circleX','NCR Closed / Open', `${fmtInt(rec.ncrClosed)} / ${fmtInt(rec.ncrOpen)}`);
      const val = Number(rec[f.key])||0;
      const flag = f.severity==='plain' ? null : (val>0?f.severity:'good');
      return kpiTile(f.icon, f.label, fmtInt(val), null, flag);
    }).join('');
    const rightHtml = group('Incidents &amp; Compliance', incidentTiles, 'cols-2');

    grid.innerHTML = `
      <div class="kpi-col" style="flex:1 1 640px; min-width:320px;">${leftHtml}</div>
      <div class="kpi-col" style="flex:0 0 300px;">${rightHtml}</div>
    `;
  }

  renderProjectTrends(pid);
  renderProjectHistoryTable(pid);
}

function frTile(rec){
  return `<div class="kpi kpi-fr">
    <div style="flex:1;">
      <div class="kpi-label" style="margin-bottom:8px;">Frequency Rates</div>
      <div class="fr-values">
        <div><div class="v">${fmtRate(rec.fr)}</div><div class="l">FR</div></div>
        <div><div class="v">${fmtRate(rec.ltifr)}</div><div class="l">LTIFR</div></div>
        <div><div class="v">${fmtRate(rec.trir)}</div><div class="l">TRIR</div></div>
      </div>
    </div>
  </div>`;
}

function indexTableTile(rec){
  return `<div class="kpi index-card">
    <div class="idx-head" style="padding-top:14px;"><span></span><span>Index</span><span>Cond.</span><span>Score</span></div>
    ${INDEX_FIELDS.map(f=>{
      const c = rec[f.key+'Conducted'], s = rec[f.key+'Score'];
      return `<div class="idx-row"><span class="idx-badge">${f.label}</span><span style="font-size:11px;color:var(--text-muted)">${f.full}</span><span class="mono">${fmtInt(c)}</span><span class="idx-score">${fmtPct(s)}</span></div>`;
    }).join('')}
    <div style="height:10px;"></div>
  </div>`;
}

function renderProjectTrends(pid){
  const rs = Store.recordsForProject(pid).slice().reverse(); // chronological
  const labels = rs.map(r=>fmtDate(r.date));
  const color = cssVar(PROJECT_BY_ID[pid].colorVar);
  renderTrendLineChart('chartProjHours', labels, rs.map(r=>r.workedManHours), color, { fmt:fmtInt });
  renderTrendLineChart('chartProjIncidents', labels, rs.map(r=>Number(r.nearMiss||0)+Number(r.firstAid||0)), cssVar('--warning'), { fmt:fmtInt });
  const note = document.getElementById('projTrendNote');
  if(note) note.textContent = rs.length<2
    ? 'Only one reporting week logged for this project — the trend will fill in as new weeks are imported.'
    : `${rs.length} reporting weeks logged for ${PROJECT_BY_ID[pid].short}.`;
}

function renderProjectHistoryTable(pid){
  const host = document.getElementById('projectHistoryTable');
  if(!host) return;
  const rs = Store.recordsForProject(pid);
  host.innerHTML = `
    <div class="table-scroll"><table class="data-table">
      <thead><tr>
        <th>Month</th><th>Week</th><th>Worked Hrs</th><th>Manpower</th><th>HSSE Alerts</th>
        <th>First Aid</th><th>Near Miss</th><th>NCR (C/O)</th><th>PSI</th><th>ASI</th><th>ESI</th><th>WSI</th><th>SSI</th>
      </tr></thead>
      <tbody>
        ${rs.map(r=>`<tr>
          <td>${monthLabel(r.month)}</td>
          <td>${fmtDate(r.date)}</td>
          <td class="mono">${fmtInt(r.workedManHours)}</td>
          <td class="mono">${fmtInt(r.manpowerAvg)}</td>
          <td class="mono">${fmtInt(r.hsseAlerts)}</td>
          <td class="mono">${fmtInt(r.firstAid)}</td>
          <td class="mono">${fmtInt(r.nearMiss)}</td>
          <td class="mono">${fmtInt(r.ncrClosed)}/${fmtInt(r.ncrOpen)}</td>
          <td class="mono">${fmtPct(r.psiScore)}</td>
          <td class="mono">${fmtPct(r.asiScore)}</td>
          <td class="mono">${fmtPct(r.esiScore)}</td>
          <td class="mono">${fmtPct(r.wsiScore)}</td>
          <td class="mono">${fmtPct(r.ssiScore)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  `;
}
