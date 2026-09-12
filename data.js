/* ===========================================================
   HSSE DASHBOARD — data model, constants, seed data
   =========================================================== */

const PROJECTS = [
  { id:'demolition',      name:'Demolition Main Plot',                                     short:'Demolition',   colorVar:'--cat-1', icon:'crane' },
  { id:'alyuser',         name:'Alyuser Hotel Transformation to Site Offices',              short:'Alyuser Hotel', colorVar:'--cat-2', icon:'building' },
  { id:'ajyad',           name:'Development of Ultra Luxury Development at Plot 0 (Ajyad)', short:'Ajyad',         colorVar:'--cat-3', icon:'layers' },
  { id:'earthworks_ksg',  name:'Earthworks for KSG',                                        short:'Earthworks KSG',colorVar:'--cat-4', icon:'mountain' },
  { id:'geotechnical',    name:'Geotechnical Work',                                         short:'Geotechnical',  colorVar:'--cat-5', icon:'drill' },
];
const PROJECT_BY_ID = Object.fromEntries(PROJECTS.map(p=>[p.id,p]));
function projectColor(id){ return getComputedStyle(document.documentElement).getPropertyValue(PROJECT_BY_ID[id]?.colorVar || '--cat-1').trim(); }
function projectNameToId(name){
  if(!name) return null;
  const n = String(name).trim().toLowerCase();
  const hit = PROJECTS.find(p => p.name.toLowerCase()===n || p.short.toLowerCase()===n || p.id===n);
  if(hit) return hit.id;
  // loose contains match
  const hit2 = PROJECTS.find(p => n.includes(p.short.toLowerCase()) || p.name.toLowerCase().includes(n));
  return hit2 ? hit2.id : null;
}

/* Metric field catalogue - drives KPI tiles, excel columns, and the per-project grid. */
const FIELD_GROUPS = [
  { key:'hours', fields:[
    { key:'workedManHours', label:'Worked Man Hours', icon:'clock', kind:'int', flag:'plain' },
    { key:'safeManhours',   label:'Safe Manhours',     icon:'userClock', kind:'int', flag:'good' },
  ]},
  { key:'people', fields:[
    { key:'manpowerAvg',      label:'Manpower (Avg)',        icon:'users',    kind:'int' },
    { key:'hsseStaffAvg',     label:'HSSE Staff (Avg)',      icon:'hardhat',  kind:'int' },
    { key:'securityStaffAvg', label:'Security Staff (Avg)',  icon:'shield',   kind:'int' },
    { key:'hsseAlerts',       label:'HSSE Alerts',           icon:'bell',     kind:'int' },
  ]},
  { key:'engagement', fields:[
    { key:'safetyOrientedEmployees', label:'Safety Oriented Employees', icon:'users',      kind:'int' },
    { key:'weeklyTbtMeeting',        label:'Weekly TBT Meeting',        icon:'users',      kind:'int' },
    { key:'rewardsRecognitions',     label:'Rewards & Recognitions',    icon:'award',      kind:'int' },
  ]},
  { key:'training', fields:[
    { key:'specificHsseTraining',  label:'Specific HSSE Training', icon:'graduationCap', kind:'int' },
    { key:'managementWalkthrough', label:'Management Walkthrough', icon:'footprints',     kind:'int' },
    { key:'emergencyDrills',       label:'Emergency Drills',       icon:'flame',          kind:'int' },
  ]},
  { key:'coordination', fields:[
    { key:'externalHsseTraining', label:'External HSSE Training', icon:'graduationCap', kind:'int' },
    { key:'coordinationMeeting',  label:'Coordination Meeting',   icon:'handshake',      kind:'int' },
    { key:'hsseCampaign',         label:'HSSE Campaign',          icon:'megaphone',      kind:'int' },
  ]},
];
/* Incident / highlighted column - mirrors the amber-dashed column in the source report */
const INCIDENT_FIELDS = [
  { key:'fatality',              label:'Fatality',              icon:'skull',    kind:'int', severity:'critical' },
  { key:'lti',                   label:'LTI',                   icon:'bed',      kind:'int', severity:'critical' },
  { key:'rdi',                   label:'RDI',                   icon:'suitcase', kind:'int', severity:'warning' },
  { key:'mtc',                   label:'MTC',                   icon:'image',    kind:'int', severity:'warning' },
  { key:'firstAid',              label:'First Aid',             icon:'medkit',   kind:'int', severity:'plain' },
  { key:'nearMiss',              label:'Near Miss',             icon:'alertTriangle', kind:'int', severity:'plain' },
  { key:'environmentIncidents',  label:'Environment Incidents', icon:'recycle',  kind:'int', severity:'warning' },
  { key:'ncr',                   label:'NCR Closed / Open',     icon:'circleX',  kind:'ncr',  severity:'plain' },
];
const RATE_FIELDS = [
  { key:'fr',    label:'FR – Fatality Rate' },
  { key:'ltifr', label:'LTIFR – Lost Time Injury' },
  { key:'trir',  label:'TRIR – Recordable Incidents' },
];
const INDEX_FIELDS = [
  { key:'psi', label:'PSI', full:'Project Safety Index' },
  { key:'asi', label:'ASI', full:'Accommodation Safety Index' },
  { key:'esi', label:'ESI', full:'Environment Safety Index' },
  { key:'wsi', label:'WSI', full:'Wellbeing Safety Index' },
  { key:'ssi', label:'SSI', full:'Security Safety Index' },
];

const ALL_NUMERIC_KEYS = [
  'workedManHours','safeManhours','fr','ltifr','trir',
  'manpowerAvg','hsseStaffAvg','securityStaffAvg','hsseAlerts',
  'fatality','lti','rdi','mtc','environmentIncidents','ncrClosed','ncrOpen',
  'safetyOrientedEmployees','weeklyTbtMeeting','rewardsRecognitions',
  'firstAid','nearMiss',
  'specificHsseTraining','managementWalkthrough','emergencyDrills',
  'externalHsseTraining','coordinationMeeting','hsseCampaign',
  'psiConducted','psiScore','asiConducted','asiScore','esiConducted','esiScore',
  'wsiConducted','wsiScore','ssiConducted','ssiScore',
];

const EXCEL_COLUMNS = [
  { key:'month',   header:'Month' },
  { key:'date',    header:'Week (Report Date)' },
  { key:'project', header:'Project' },
  { key:'workedManHours', header:'Worked Man Hours' },
  { key:'safeManhours',   header:'Safe Manhours' },
  { key:'fr',    header:'FR (Fatality Rate)' },
  { key:'ltifr', header:'LTIFR (Lost Time Injury Freq. Rate)' },
  { key:'trir',  header:'TRIR (Recordable Incident Rate)' },
  { key:'manpowerAvg',      header:'Manpower (Avg)' },
  { key:'hsseStaffAvg',     header:'HSSE Staff (Avg)' },
  { key:'securityStaffAvg', header:'Security Staff (Avg)' },
  { key:'hsseAlerts',       header:'HSSE Alerts' },
  { key:'fatality', header:'Fatality' },
  { key:'lti',      header:'LTI' },
  { key:'rdi',      header:'RDI' },
  { key:'mtc',      header:'MTC' },
  { key:'environmentIncidents', header:'Environment Incidents' },
  { key:'ncrClosed', header:'NCR Closed' },
  { key:'ncrOpen',   header:'NCR Open' },
  { key:'safetyOrientedEmployees', header:'Safety Oriented Employees' },
  { key:'weeklyTbtMeeting',        header:'Weekly TBT Meeting' },
  { key:'rewardsRecognitions',     header:'Rewards & Recognitions' },
  { key:'firstAid',  header:'First Aid' },
  { key:'nearMiss',  header:'Near Miss' },
  { key:'specificHsseTraining',  header:'Specific HSSE Training' },
  { key:'managementWalkthrough', header:'Management Walkthrough' },
  { key:'emergencyDrills',       header:'Emergency Drills' },
  { key:'externalHsseTraining', header:'External HSSE Training' },
  { key:'coordinationMeeting',  header:'Coordination Meeting' },
  { key:'hsseCampaign',         header:'HSSE Campaign' },
  { key:'psiConducted', header:'PSI - Total Conducted' },
  { key:'psiScore',     header:'PSI - Recent Score (%)' },
  { key:'asiConducted', header:'ASI - Total Conducted' },
  { key:'asiScore',     header:'ASI - Recent Score (%)' },
  { key:'esiConducted', header:'ESI - Total Conducted' },
  { key:'esiScore',     header:'ESI - Recent Score (%)' },
  { key:'wsiConducted', header:'WSI - Total Conducted' },
  { key:'wsiScore',     header:'WSI - Recent Score (%)' },
  { key:'ssiConducted', header:'SSI - Total Conducted' },
  { key:'ssiScore',     header:'SSI - Recent Score (%)' },
];

const STORAGE_KEYS = {
  records: 'hsse_dashboard_records_v1',
  photos:  'hsse_dashboard_photos_v1',
  theme:   'hsse_dashboard_theme_v1',
};

function monthLabel(m){ // 'YYYY-MM' -> 'July 2026'
  if(!m) return '';
  const [y,mo] = m.split('-').map(Number);
  return new Date(y, mo-1, 1).toLocaleDateString('en-US', { month:'long', year:'numeric' });
}
function toMonthKey(dateStr){ return dateStr ? dateStr.slice(0,7) : ''; }
function fmtDate(d){
  if(!d) return '—';
  const dt = new Date(d+'T00:00:00');
  if(isNaN(dt)) return d;
  return dt.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
function fmtInt(n){ n = Number(n)||0; return n.toLocaleString('en-US'); }
function fmtPct(n){ return `${Number(n)||0}%`; }
function fmtRate(n){ return (Number(n)||0).toFixed(2); }
function recordKey(rec){ return `${rec.project}__${rec.month}__${rec.date}`; }

function makeSeedRecords(){
  const date = '2026-07-10';
  const month = '2026-07';
  const base = { date, month };
  const rows = {
    demolition: {
      workedManHours:738284, safeManhours:738284, fr:0, ltifr:0, trir:0,
      manpowerAvg:59, hsseStaffAvg:3, securityStaffAvg:16, hsseAlerts:2,
      fatality:0, lti:0, rdi:0, mtc:0, environmentIncidents:0, ncrClosed:7, ncrOpen:0,
      safetyOrientedEmployees:671, weeklyTbtMeeting:415, rewardsRecognitions:8,
      firstAid:58, nearMiss:90,
      specificHsseTraining:991, managementWalkthrough:31, emergencyDrills:7,
      externalHsseTraining:0, coordinationMeeting:32, hsseCampaign:10,
      psiConducted:10, psiScore:74, asiConducted:9, asiScore:82, esiConducted:7, esiScore:80,
      wsiConducted:6, wsiScore:80, ssiConducted:6, ssiScore:86,
    },
    alyuser: {
      workedManHours:217518, safeManhours:217518, fr:0, ltifr:0, trir:0,
      manpowerAvg:21, hsseStaffAvg:2, securityStaffAvg:2, hsseAlerts:2,
      fatality:0, lti:0, rdi:0, mtc:0, environmentIncidents:0, ncrClosed:9, ncrOpen:0,
      safetyOrientedEmployees:572, weeklyTbtMeeting:180, rewardsRecognitions:8,
      firstAid:19, nearMiss:39,
      specificHsseTraining:265, managementWalkthrough:32, emergencyDrills:3,
      externalHsseTraining:1, coordinationMeeting:29, hsseCampaign:2,
      psiConducted:7, psiScore:84, asiConducted:5, asiScore:76, esiConducted:7, esiScore:82,
      wsiConducted:7, wsiScore:77, ssiConducted:7, ssiScore:77,
    },
    ajyad: {
      workedManHours:61960, safeManhours:61960, fr:0, ltifr:0, trir:0,
      manpowerAvg:202, hsseStaffAvg:14, securityStaffAvg:10, hsseAlerts:3,
      fatality:0, lti:0, rdi:0, mtc:0, environmentIncidents:0, ncrClosed:0, ncrOpen:0,
      safetyOrientedEmployees:202, weeklyTbtMeeting:5, rewardsRecognitions:0,
      firstAid:0, nearMiss:1,
      specificHsseTraining:1, managementWalkthrough:1, emergencyDrills:0,
      externalHsseTraining:0, coordinationMeeting:6, hsseCampaign:0,
      psiConducted:0, psiScore:0, asiConducted:0, asiScore:0, esiConducted:0, esiScore:0,
      wsiConducted:0, wsiScore:0, ssiConducted:0, ssiScore:0,
    },
    earthworks_ksg: {
      workedManHours:64723, safeManhours:64723, fr:0, ltifr:0, trir:0,
      manpowerAvg:133, hsseStaffAvg:10, securityStaffAvg:7, hsseAlerts:8,
      fatality:0, lti:0, rdi:0, mtc:0, environmentIncidents:0, ncrClosed:1, ncrOpen:0,
      safetyOrientedEmployees:180, weeklyTbtMeeting:11, rewardsRecognitions:2,
      firstAid:1, nearMiss:22,
      specificHsseTraining:6, managementWalkthrough:11, emergencyDrills:3,
      externalHsseTraining:4, coordinationMeeting:17, hsseCampaign:4,
      psiConducted:3, psiScore:81, asiConducted:0, asiScore:0, esiConducted:1, esiScore:74,
      wsiConducted:0, wsiScore:0, ssiConducted:1, ssiScore:61,
    },
    geotechnical: {
      workedManHours:53864, safeManhours:53864, fr:0, ltifr:0, trir:0,
      manpowerAvg:48, hsseStaffAvg:4, securityStaffAvg:0, hsseAlerts:4,
      fatality:0, lti:0, rdi:0, mtc:0, environmentIncidents:0, ncrClosed:4, ncrOpen:3,
      safetyOrientedEmployees:136, weeklyTbtMeeting:112, rewardsRecognitions:0,
      firstAid:0, nearMiss:18,
      specificHsseTraining:63, managementWalkthrough:16, emergencyDrills:1,
      externalHsseTraining:0, coordinationMeeting:15, hsseCampaign:5,
      psiConducted:3, psiScore:73, asiConducted:0, asiScore:0, esiConducted:0, esiScore:0,
      wsiConducted:0, wsiScore:0, ssiConducted:0, ssiScore:0,
    },
  };
  return PROJECTS.map(p => ({ project:p.id, ...base, ...rows[p.id] }));
}
