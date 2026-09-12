/* ===========================================================
   Chart helpers (Chart.js) — palette-aware, one-axis, legend rules
   =========================================================== */
const ChartRegistry = {};
function destroyChart(id){ if(ChartRegistry[id]){ ChartRegistry[id].destroy(); delete ChartRegistry[id]; } }
function cssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function baseFont(){ return { family: "system-ui, -apple-system, 'Segoe UI', sans-serif", size: 11 }; }

Chart.defaults.font.family = "system-ui, -apple-system, 'Segoe UI', sans-serif";
Chart.defaults.color = () => cssVar('--text-muted');
Chart.defaults.borderColor = () => cssVar('--grid');

function gridOpts(){
  return {
    grid:{ color: cssVar('--grid'), drawTicks:false },
    border:{ color: cssVar('--baseline') },
    ticks:{ color: cssVar('--text-muted'), font: baseFont() },
  };
}

function commonTooltip(){
  return {
    backgroundColor: cssVar('--surface-3'),
    titleColor: cssVar('--text-primary'),
    bodyColor: cssVar('--text-secondary'),
    borderColor: cssVar('--border-strong'),
    borderWidth:1, padding:10, cornerRadius:8,
    titleFont:{ weight:'700', size:12 }, bodyFont:{ size:11.5 },
    displayColors:true, boxPadding:4,
  };
}

/** ---------------------------------------------------------------
 *  Always-on value labels plugin — draws each data point's value
 *  directly on the chart (bars + line points), so figures are
 *  visible at a glance without needing to hover.
 *  NOTE: the formatter/color live in a side registry keyed by
 *  canvas id — NOT inside chart.options — because Chart.js treats
 *  any function found inside `options` as a "scriptable option"
 *  and auto-invokes it with an internal context object, which
 *  would call our formatter with the wrong argument and crash.
 *  --------------------------------------------------------------- */
const ValueLabelConfig = {}; // canvasId -> { formatter, color }
function setValueLabelConfig(canvasId, formatter, color){
  ValueLabelConfig[canvasId] = { formatter: formatter || (v=>v), color: color || null };
}
const valueLabelsPlugin = {
  id: 'valueLabels',
  afterDatasetsDraw(chart){
    const cfg = chart.canvas && ValueLabelConfig[chart.canvas.id];
    if(!cfg) return;
    const { ctx } = chart;
    const fmt = cfg.formatter;
    const horizontal = chart.options.indexAxis === 'y';
    const isLine = chart.config.type === 'line';
    const nSeries = chart.data.datasets.length;

    ctx.save();
    ctx.font = "700 10.5px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillStyle = cfg.color || cssVar('--text-primary');

    chart.data.datasets.forEach((dataset, dsIndex) => {
      const meta = chart.getDatasetMeta(dsIndex);
      if(meta.hidden) return;
      meta.data.forEach((element, index) => {
        const raw = dataset.data[index];
        if(raw === null || raw === undefined || raw === '') return;
        const label = String(fmt(raw));
        if(!label) return;
        const pos = element.tooltipPosition ? element.tooltipPosition() : { x: element.x, y: element.y };

        if(isLine){
          // avoid clipping into the y-axis on the first point, or off the
          // right edge on the last point, by shifting alignment at the ends
          const isFirst = index===0, isLast = index===meta.data.length-1;
          ctx.textAlign = isFirst ? 'left' : (isLast ? 'right' : 'center');
          ctx.textBaseline = 'bottom';
          const dx = isFirst ? 5 : (isLast ? -5 : 0);
          // slight vertical stagger for multi-series lines so labels don't collide
          ctx.fillText(label, pos.x + dx, pos.y - 8 - (dsIndex*12));
        } else if(horizontal){
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, pos.x + 6, pos.y);
        } else {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          // for grouped bars, nudge label up a touch more to clear neighboring bars
          ctx.fillText(label, pos.x, pos.y - (nSeries>1?6:5));
        }
      });
    });
    ctx.restore();
  }
};
Chart.register(valueLabelsPlugin);

/** Single-series bar chart, one categorical color per bar (identity = category), no legend. */
function renderCategoryBarChart(canvasId, labels, values, colors, opts={}){
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if(!ctx) return;
  setValueLabelConfig(canvasId, opts.fmt);
  ChartRegistry[canvasId] = new Chart(ctx, {
    type:'bar',
    data:{ labels, datasets:[{
      data: values,
      backgroundColor: colors,
      borderRadius: 4,
      borderSkipped:false,
      maxBarThickness: 24,
      categoryPercentage: 0.62,
      barPercentage: 0.9,
    }]},
    options:{
      indexAxis: opts.horizontal ? 'y' : 'x',
      responsive:true, maintainAspectRatio:false,
      layout:{ padding:{ top: 22, right: opts.horizontal?46:8 } },
      plugins:{ legend:{ display:false }, tooltip:{ ...commonTooltip(),
        callbacks:{ label:(c)=> (opts.fmt ? opts.fmt(c.parsed[opts.horizontal?'x':'y']) : c.formattedValue) } } },
      scales:{
        x:{ ...gridOpts(), grid:{ ...gridOpts().grid, display: opts.horizontal }, beginAtZero:true },
        y:{ ...gridOpts(), grid:{ ...gridOpts().grid, display: !opts.horizontal }, beginAtZero:true },
      },
    }
  });
}

/** Grouped bar chart, N fixed-color series across shared categories. Legend always shown (>=2 series). */
function renderGroupedBarChart(canvasId, labels, series, opts={}){
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if(!ctx) return;
  setValueLabelConfig(canvasId, opts.fmt);
  ChartRegistry[canvasId] = new Chart(ctx, {
    type:'bar',
    data:{ labels, datasets: series.map(s=>({
      label: s.label, data: s.data, backgroundColor: s.color,
      borderRadius:4, borderSkipped:false, maxBarThickness:22, categoryPercentage:0.62, barPercentage:0.85,
    })) },
    options:{
      responsive:true, maintainAspectRatio:false,
      layout:{ padding:{ top: 22 } },
      plugins:{
        legend:{ position:'top', align:'end', labels:{ boxWidth:9, boxHeight:9, usePointStyle:true, pointStyle:'rectRounded', color: cssVar('--text-secondary'), font:baseFont() } },
        tooltip: commonTooltip(),
      },
      scales:{ x:{ ...gridOpts(), grid:{ display:false } }, y:{ ...gridOpts(), beginAtZero:true } },
    }
  });
}

/** Single-series line/trend chart across time. One color, optional area wash, no legend. */
function renderTrendLineChart(canvasId, labels, values, color, opts={}){
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if(!ctx) return;
  setValueLabelConfig(canvasId, opts.fmt, color);
  const g = ctx.getContext('2d');
  const grad = g.createLinearGradient(0,0,0,220);
  grad.addColorStop(0, color + '33');
  grad.addColorStop(1, color + '02');
  ChartRegistry[canvasId] = new Chart(ctx, {
    type:'line',
    data:{ labels, datasets:[{
      data: values, borderColor: color, backgroundColor: grad,
      borderWidth:2, pointRadius: values.length>1?4:5, pointHoverRadius:6,
      pointBackgroundColor: color, pointBorderColor: cssVar('--surface-1'), pointBorderWidth:2,
      fill:true, tension:0.35,
    }]},
    options:{
      responsive:true, maintainAspectRatio:false,
      layout:{ padding:{ top: 24 } },
      plugins:{ legend:{ display:false }, tooltip:{ ...commonTooltip(),
        callbacks:{ label:(c)=> opts.fmt ? opts.fmt(c.parsed.y) : c.formattedValue } } },
      scales:{ x:{ ...gridOpts(), grid:{ display:false } }, y:{ ...gridOpts(), beginAtZero:true } },
    }
  });
}

/** Small inline sparkline (frequency-rate cards) */
function renderSparkline(canvasId, values, color){
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if(!ctx) return;
  ChartRegistry[canvasId] = new Chart(ctx, {
    type:'line',
    data:{ labels: values.map((_,i)=>i), datasets:[{ data: values.length?values:[0,0], borderColor: color, borderWidth:2, pointRadius:0, tension:0.4, fill:false }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{enabled:false} },
      scales:{ x:{ display:false }, y:{ display:false } }, elements:{ line:{ borderJoinStyle:'round' } } }
  });
}
