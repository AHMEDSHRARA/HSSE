/* ===========================================================
   Executive Summary tab
   =========================================================== */
function aggregateSnapshot(snapshot){
  const sumKeys = ['workedManHours','safeManhours','manpowerAvg','hsseStaffAvg','securityStaffAvg',
    'hsseAlerts','fatality','lti','rdi','mtc','environmentIncidents','ncrClosed','ncrOpen',
    'safetyOrientedEmployees','weeklyTbtMeeting','rewardsRecognitions','firstAid','nearMiss',
    'specificHsseTraining','managementWalkthrough','emergencyDrills','externalHsseTraining',
    'coordinationMeeting','hsseCampaign'];
  const agg = Object.fromEntries(sumKeys.map(k=>[k,0]));
  snapshot.forEach(r => sumKeys.forEach(k => agg[k] += Number(r[k])||0));

  const hours = agg.workedManHours || 0;
  const wAvg = (key) => {
    const withHours = snapshot.filter(r=>Number(r.workedManHours)>0);
    const totalH = withHours.reduce((s,r)=>s+Number(r.workedManHours),0) || 1;
    return withHours.reduce((s,r)=> s + (Number(r[key])||0) * Number(r.workedManHours), 0) / totalH;
  };
  agg.fr = wAvg('fr'); agg.ltifr = wAvg('ltifr'); agg.trir = wAvg('trir');

  INDEX_FIELDS.forEach(f=>{
    const cKey = f.key+'Conducted', sKey = f.key+'Score';
    const conducted = snapshot.reduce((s,r)=>s+(Number(r[cKey])||0),0);
    const withData = snapshot.filter(r=>Number(r[cKey])>0);
    const totalC = withData.reduce((s,r)=>s+Number(r[cKey]),0) || 0;
    const score = totalC>0 ? Math.round(withData.reduce((s,r)=>s+Number(r[sKey])*Number(r[cKey]),0)/totalC) : 0;
    agg[cKey]=conducted; agg[sKey]=score;
  });
  return agg;
}

function renderExecutiveSummary(){
  const monthSel = document.getElementById('execMonthFilter');
  const months = Store.distinctMonths();
  if(monthSel){
    const cur = Store.filters.execMonth;
    monthSel.innerHTML = `<option value="all">All Months (Latest per Project)</option>` +
      months.map(m=>`<option value="${m}">${monthLabel(m)}</option>`).join('');
    monthSel.value = months.includes(cur) ? cur : 'all';
    Store.filters.execMonth = monthSel.value;
  }

  const snapshot = Store.snapshotForExecutive(Store.filters.execMonth);
  const agg = aggregateSnapshot(snapshot);
  const missing = PROJECTS.length - snapshot.length;

  const kpiHost = document.getElementById('execKpiGrid');
  if(kpiHost){
    kpiHost.innerHTML = `
      ${kpiTile('clock','Total Worked Man Hours', fmtInt(agg.workedManHours), null,'plain')}
      ${kpiTile('userClock','Total Safe Manhours', fmtInt(agg.safeManhours), null,'good')}
      ${kpiTile('users','Total Manpower (Avg)', fmtInt(agg.manpowerAvg))}
      ${kpiTile('hardhat','Total HSSE Staff (Avg)', fmtInt(agg.hsseStaffAvg))}
      ${kpiTile('shield','Total Security Staff (Avg)', fmtInt(agg.securityStaffAvg))}
      ${kpiTile('bell','Total HSSE Alerts', fmtInt(agg.hsseAlerts))}

      ${frTile(agg)}

      ${kpiTile('skull','Fatality', fmtInt(agg.fatality), null, agg.fatality>0?'critical':'good')}
      ${kpiTile('bed','LTI', fmtInt(agg.lti), null, agg.lti>0?'critical':'good')}
      ${kpiTile('suitcase','RDI', fmtInt(agg.rdi), null, agg.rdi>0?'warning':'good')}
      ${kpiTile('medkit','First Aid', fmtInt(agg.firstAid))}
      ${kpiTile('alertTriangle','Near Miss', fmtInt(agg.nearMiss))}
      ${kpiTile('recycle','Environment Incidents', fmtInt(agg.environmentIncidents), null, agg.environmentIncidents>0?'warning':'good')}
      ${kpiTile('circleX','NCR Closed / Open', `${fmtInt(agg.ncrClosed)} / ${fmtInt(agg.ncrOpen)}`)}
      ${kpiTile('award','Rewards & Recognitions', fmtInt(agg.rewardsRecognitions))}
    `;
  }

  const note = document.getElementById('execCoverageNote');
  if(note) note.textContent = missing>0
    ? `Showing ${snapshot.length} of ${PROJECTS.length} projects for this period — ${missing} project(s) have no data logged yet.`
    : `All ${PROJECTS.length} projects reporting.`;

  renderExecCharts(snapshot, agg);
  renderExecIndexTable(agg);
  renderExecProjectTable(snapshot);
  renderExecTrends();
}

function renderExecProjectTable(snapshot){
  const host = document.getElementById('execProjectTable');
  if(!host) return;
  const rows = PROJECTS.map(p => snapshot.find(r=>r.project===p.id) || null);
  host.innerHTML = `
    <div class="table-scroll"><table class="data-table">
      <thead><tr>
        <th>Project</th><th>Week</th><th>Worked Hrs</th><th>Manpower</th>
        <th>FR</th><th>LTIFR</th><th>TRIR</th>
        <th>First Aid</th><th>Near Miss</th><th>NCR (C/O)</th>
        <th>PSI</th><th>ASI</th><th>ESI</th><th>WSI</th><th>SSI</th>
      </tr></thead>
      <tbody>
        ${PROJECTS.map((p,i)=>{
          const r = rows[i];
          const color = cssVar(p.colorVar);
          if(!r) return `<tr><td><span class="tag" style="background:${color}22;color:${color}">${p.short}</span></td><td colspan="14" style="color:var(--text-muted);">No data logged yet</td></tr>`;
          return `<tr>
            <td><span class="tag" style="background:${color}22;color:${color}">${p.short}</span></td>
            <td>${fmtDate(r.date)}</td>
            <td class="mono">${fmtInt(r.workedManHours)}</td>
            <td class="mono">${fmtInt(r.manpowerAvg)}</td>
            <td class="mono">${fmtRate(r.fr)}</td>
            <td class="mono">${fmtRate(r.ltifr)}</td>
            <td class="mono">${fmtRate(r.trir)}</td>
            <td class="mono">${fmtInt(r.firstAid)}</td>
            <td class="mono">${fmtInt(r.nearMiss)}</td>
            <td class="mono">${fmtInt(r.ncrClosed)}/${fmtInt(r.ncrOpen)}</td>
            <td class="mono">${fmtPct(r.psiScore)}</td>
            <td class="mono">${fmtPct(r.asiScore)}</td>
            <td class="mono">${fmtPct(r.esiScore)}</td>
            <td class="mono">${fmtPct(r.wsiScore)}</td>
            <td class="mono">${fmtPct(r.ssiScore)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
  `;
}

function kpiTile(iconName, label, value, sub, flag){
  const flagClass = flag ? `flag-${flag}` : '';
  return `<div class="kpi ${flagClass}">
    <div class="kpi-top"><div class="kpi-icon">${icon(iconName)}</div></div>
    <div class="kpi-label">${label}</div>
    <div class="kpi-value">${value}</div>
    ${sub?`<div class="kpi-sub">${sub}</div>`:''}
  </div>`;
}

function frTile(agg){
  return `<div class="kpi kpi-fr" style="grid-column: span 2;">
    <div style="flex:1;">
      <div class="kpi-label" style="margin-bottom:8px;">Frequency Rates</div>
      <div class="fr-values">
        <div><div class="v">${fmtRate(agg.fr)}</div><div class="l">FR</div></div>
        <div><div class="v">${fmtRate(agg.ltifr)}</div><div class="l">LTIFR</div></div>
        <div><div class="v">${fmtRate(agg.trir)}</div><div class="l">TRIR</div></div>
      </div>
    </div>
  </div>`;
}

function renderExecCharts(snapshot, agg){
  const labels = snapshot.map(r=>PROJECT_BY_ID[r.project].short);
  const colors = snapshot.map(r=>cssVar(PROJECT_BY_ID[r.project].colorVar));

  renderCategoryBarChart('chartManHoursByProject', labels, snapshot.map(r=>r.workedManHours), colors, { fmt:fmtInt });

  renderGroupedBarChart('chartIncidentsByProject', labels, [
    { label:'Near Miss', data: snapshot.map(r=>r.nearMiss), color: cssVar('--cat-1') },
    { label:'First Aid', data: snapshot.map(r=>r.firstAid), color: cssVar('--cat-2') },
  ]);

  const idxLabels = INDEX_FIELDS.map(f=>f.label);
  const idxValues = INDEX_FIELDS.map(f=>agg[f.key+'Score']);
  renderCategoryBarChart('chartIndexScores', idxLabels, idxValues, idxLabels.map(()=>cssVar('--accent')), { fmt:fmtPct });
}

function renderExecIndexTable(agg){
  const host = document.getElementById('execIndexTable');
  if(!host) return;
  host.innerHTML = `
    <div class="idx-head" style="padding-top:14px;"><span></span><span>Index</span><span>Cond.</span><span>Score</span></div>
    ${INDEX_FIELDS.map(f=>{
      const conducted = agg[f.key+'Conducted'], score = agg[f.key+'Score'];
      return `<div class="idx-row">
        <span class="idx-badge">${f.label}</span>
        <span>${f.full}</span>
        <span class="mono">${fmtInt(conducted)}</span>
        <span class="idx-score">${fmtPct(score)}</span>
      </div>
      <div class="idx-bar"><span style="width:${Math.min(100,score)}%"></span></div>`;
    }).join('')}
    <div style="height:10px;"></div>
  `;
}

function renderExecTrends(){
  const months = Store.distinctMonths().slice().sort(); // ascending
  const hoursByMonth = months.map(m => Store.records.filter(r=>r.month===m).reduce((s,r)=>s+Number(r.workedManHours||0),0));
  const trirByMonth = months.map(m => {
    const rs = Store.records.filter(r=>r.month===m && Number(r.workedManHours)>0);
    const totalH = rs.reduce((s,r)=>s+Number(r.workedManHours),0) || 1;
    return rs.reduce((s,r)=>s+Number(r.trir||0)*Number(r.workedManHours),0)/totalH;
  });
  const labels = months.map(monthLabel);
  renderTrendLineChart('chartHoursTrend', labels, hoursByMonth, cssVar('--cat-1'), { fmt:fmtInt });
  renderTrendLineChart('chartTrirTrend', labels, trirByMonth, cssVar('--critical'), { fmt:fmtRate });
  const trendNote = document.getElementById('execTrendNote');
  if(trendNote) trendNote.textContent = months.length<2
    ? 'Only one reporting period logged so far — trend lines will build out automatically as you import new weeks/months via Excel.'
    : `Showing ${months.length} reporting periods.`;
}
