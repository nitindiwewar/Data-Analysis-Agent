import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Box, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { Immersive3DVisualizer } from './Immersive3DVisualizer.jsx';

// Register Chart.js elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PALETTE = [
  { bg: 'rgba(37, 99, 235, 0.8)', border: '#1d4ed8' },   // Blue
  { bg: 'rgba(147, 51, 234, 0.8)', border: '#7e22ce' },  // Purple
  { bg: 'rgba(16, 185, 129, 0.8)', border: '#059669' },  // Emerald
  { bg: 'rgba(245, 158, 11, 0.8)', border: '#d97706' },  // Amber
  { bg: 'rgba(239, 68, 68, 0.8)', border: '#dc2626' },   // Rose
  { bg: 'rgba(6, 182, 212, 0.8)', border: '#0891b2' },   // Cyan
  { bg: 'rgba(249, 115, 22, 0.8)', border: '#ea580c' },  // Orange
  { bg: 'rgba(139, 92, 246, 0.8)', border: '#6d28d9' }   // Violet
];

export const DynamicChartRenderer = ({
  chartData,
  recommendedVisualization = 'bar',
  title = 'Visual Breakdown'
}) => {
  const [activeType, setActiveType] = useState(() => {
    const rec = (recommendedVisualization || 'bar').toLowerCase();
    if (rec.includes('line')) return 'line';
    if (rec.includes('pie') || rec.includes('donut') || rec.includes('doughnut')) return 'pie';
    return 'bar';
  });

  const statsMeta = chartData?.statsMeta;

  // Prepare normalized chart data
  const formattedData = useMemo(() => {
    if (!chartData || !chartData.labels || !chartData.datasets || chartData.datasets.length === 0) {
      return null;
    }

    const labels = chartData.labels || [];
    const rawDatasets = chartData.datasets || [];

    const datasets = rawDatasets.map((ds, dIdx) => {
      const isPie = activeType === 'pie';
      const isLine = activeType === 'line';

      const bgColors = isPie
        ? labels.map((_, i) => PALETTE[i % PALETTE.length].bg)
        : isLine
        ? 'rgba(37, 99, 235, 0.15)'
        : labels.map((_, i) => PALETTE[i % PALETTE.length].bg);

      const borderColors = isPie
        ? labels.map((_, i) => PALETTE[i % PALETTE.length].border)
        : isLine
        ? '#2563eb'
        : labels.map((_, i) => PALETTE[i % PALETTE.length].border);

      return {
        label: ds.label || chartData.metric_name || 'Metric',
        data: ds.data || [],
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 2,
        borderRadius: activeType === 'bar' ? 6 : 0,
        fill: isLine,
        tension: 0.35,
        pointBackgroundColor: '#1d4ed8',
        pointBorderColor: '#ffffff',
        pointHoverRadius: 6,
        pointRadius: isLine ? 4 : 0
      };
    });

    return { labels, datasets };
  }, [chartData, activeType]);

  // Dynamic Metric Formatter to avoid hardcoding static price on Y-axis
  const metricInfo = useMemo(() => {
    const rawType = chartData?.metric_type || formattedData?.datasets?.[0]?.metricType;
    const rawLabel = formattedData?.datasets?.[0]?.label || chartData?.metric_name || '';
    const combined = `${rawType || ''} ${rawLabel} ${title}`.toLowerCase();

    const isPercent = combined.includes('percent') || combined.includes('pct') || combined.includes('margin') || combined.includes('growth') || combined.includes('rate');
    const isCount = combined.includes('count') || combined.includes('qty') || combined.includes('quantity') || combined.includes('unit') || combined.includes('item') || combined.includes('order') || combined.includes('user') || combined.includes('customer') || combined.includes('product');
    const isCurrency = !isCount && !isPercent && (rawType === 'currency' || combined.includes('revenue') || combined.includes('price') || combined.includes('sales') || combined.includes('budget') || combined.includes('cost') || combined.includes('profit') || combined.includes('amount') || combined.includes('spent'));

    const formatTick = (val) => {
      if (typeof val !== 'number' || isNaN(val)) return val;
      if (isPercent) return `${val.toFixed(1)}%`;
      const absVal = Math.abs(val);
      let numStr = '';
      if (absVal >= 1_000_000_000) numStr = `${(val / 1_000_000_000).toFixed(1)}B`;
      else if (absVal >= 1_000_000) numStr = `${(val / 1_000_000).toFixed(1)}M`;
      else if (absVal >= 100_000 && isCurrency) numStr = `${(val / 100_000).toFixed(1)}L`;
      else if (absVal >= 1_000) numStr = `${(val / 1_000).toFixed(0)}k`;
      else numStr = Number.isInteger(val) ? val.toString() : val.toFixed(1);

      return isCurrency ? `₹${numStr}` : numStr;
    };

    const formatTooltip = (val) => {
      if (typeof val !== 'number' || isNaN(val)) return val;
      if (isPercent) return `${val.toFixed(2)}%`;
      if (isCurrency) return `₹${val.toLocaleString('en-IN')}`;
      return val.toLocaleString();
    };

    return {
      label: rawLabel || 'Value',
      isCurrency,
      isPercent,
      isCount,
      formatTick,
      formatTooltip
    };
  }, [chartData, formattedData, title]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: activeType === 'pie' || (formattedData?.datasets?.length || 0) > 1,
          position: 'top',
          labels: {
            font: { size: 11, weight: 'bold', family: 'ui-sans-serif, system-ui' },
            color: '#1e293b',
            boxWidth: 12,
            padding: 10
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { size: 12, weight: 'bold' },
          bodyFont: { size: 11 },
          padding: 8,
          cornerRadius: 6,
          callbacks: {
            label: function (context) {
              const val = context.raw;
              const formatted = metricInfo.formatTooltip(val);
              return ` ${context.dataset.label || 'Value'}: ${formatted}`;
            }
          }
        }
      },
      scales: activeType === 'pie' ? {} : {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 10, weight: '600' },
            color: '#475569',
            maxRotation: 35
          }
        },
        y: {
          grid: { color: '#f1f5f9' },
          title: {
            display: Boolean(metricInfo.label),
            text: metricInfo.label,
            font: { size: 10, weight: '700' },
            color: '#64748b'
          },
          ticks: {
            font: { size: 10, weight: '600' },
            color: '#475569',
            callback: function (value) {
              return metricInfo.formatTick(value);
            }
          }
        }
      }
    };
  }, [activeType, formattedData, metricInfo]);

  if (!formattedData || !formattedData.labels || formattedData.labels.length === 0) {
    return null;
  }

  const valuesFor3D = formattedData?.datasets?.[0]?.data || [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2">
      {/* Header & Chart Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
          <BarChart3 className="h-3.5 w-3.5 text-slate-700" />
          <span>{title}</span>
        </div>

        {/* View Switcher: Bar | Line | Pie | 3D Immersive */}
        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveType('bar')}
            title="Bar Chart"
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
              activeType === 'bar' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="h-3 w-3" />
            <span className="hidden sm:inline">Bar</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveType('line')}
            title="Line Chart"
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
              activeType === 'line' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LineChartIcon className="h-3 w-3" />
            <span className="hidden sm:inline">Line</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveType('pie')}
            title="Pie / Donut Chart"
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
              activeType === 'pie' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChartIcon className="h-3 w-3" />
            <span className="hidden sm:inline">Pie</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveType('3d')}
            title="3D Immersive Analytics Mode"
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
              activeType === '3d' ? 'bg-slate-900 text-cyan-300 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Box className="h-3 w-3 text-cyan-500" />
            <span>3D Space</span>
          </button>
        </div>
      </div>

      {/* AI-Augmented Anomaly & Trend Callout Banner */}
      {statsMeta && (statsMeta.has_anomaly || statsMeta.trend !== 'stable') && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            {statsMeta.has_anomaly ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                <AlertTriangle className="h-3 w-3 text-amber-600" />
                Anomaly: {statsMeta.outlier?.label} ({statsMeta.outlier?.deviationPercent > 0 ? '+' : ''}{statsMeta.outlier?.deviationPercent}%)
              </span>
            ) : null}
            {statsMeta.trend !== 'stable' && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                statsMeta.trend === 'upward'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {statsMeta.trend === 'upward' ? <TrendingUp className="h-3 w-3 text-emerald-600" /> : <TrendingDown className="h-3 w-3 text-rose-600" />}
                {statsMeta.trend === 'upward' ? 'Growth Trend' : 'Contraction Trend'}: {statsMeta.growth_rate > 0 ? '+' : ''}{statsMeta.growth_rate}%
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Augmented Analysis (z-score threshold ±1.75)
          </span>
        </div>
      )}

      {/* Chart Stage: 2D or 3D Immersive */}
      {activeType === '3d' ? (
        <Immersive3DVisualizer
          labels={formattedData.labels}
          values={valuesFor3D}
          metricLabel={metricInfo.label}
          isCurrency={metricInfo.isCurrency}
        />
      ) : (
        <div className="h-64 sm:h-72 w-full relative">
          {activeType === 'bar' && <Bar data={formattedData} options={chartOptions} />}
          {activeType === 'line' && <Line data={formattedData} options={chartOptions} />}
          {activeType === 'pie' && <Doughnut data={formattedData} options={chartOptions} />}
        </div>
      )}
    </div>
  );
};
export default React.memo(DynamicChartRenderer);
