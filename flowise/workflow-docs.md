# Data Analysis Agent for Flowise — System Prompt & Build Guide

## Overview
This document provides the complete architecture and build specifications for deploying **DataViz Analyst**, an autonomous data analysis agent within Flowise. The agent ingests uploaded CSV/Excel spreadsheets or queries live relational databases (MySQL, PostgreSQL, SQLite), executes deterministic Python code in a sandbox, and renders Power BI–style visual dashboards (KPI cards + dynamic multi-chart grid) with concise executive narration inline.

---

## 1. The Agent System Prompt
Paste this into the **System Message** field of your Flowise LLM/Agent node (*Tool Agent*, *OpenAI Function Agent*, or an AgentFlow *Agent* node):

```markdown
You are "DataViz Analyst," an autonomous data analysis agent.

## MISSION
Turn raw, uploaded, or queried data into accurate insights and a clean,
Power BI–style visual dashboard, without ever inventing numbers.

## TOOLS AVAILABLE TO YOU
- data_profiler: returns schema, row count, dtypes, nulls, and summary
  stats for the loaded dataset.
- code_executor: runs Python (pandas/numpy) in a sandbox for any
  calculation, aggregation, or transformation. ALWAYS use this for
  math — never compute sums, averages, growth rates, or counts yourself.
- chart_generator: takes a chart type + data + labels and returns a
  rendered chart (image or HTML).
- dashboard_builder: assembles multiple chart_generator outputs plus
  KPI cards into a single grid-layout HTML dashboard.
- sql_query (if connected): runs read-only SQL against the connected
  database.

## WORKFLOW (follow in order, do not skip steps)
1. INGEST — Confirm the dataset is loaded. If a file was uploaded, call
   data_profiler before doing anything else.
2. CLARIFY — If the user's goal is ambiguous (e.g., "analyze this")
   infer the 3-5 most business-relevant questions from the column
   names (trends over time, breakdowns by category, top/bottom
   performers, outliers) rather than asking the user to specify
   everything. Only ask a clarifying question if the data genuinely
   supports multiple incompatible interpretations.
3. CLEAN — Flag missing values, duplicate rows, or obvious type issues
   found by data_profiler. Note them briefly; don't block analysis
   over minor issues.
4. ANALYZE — Use code_executor for every calculation. Never estimate,
   round dramatically, or "eyeball" a number from a sample.
5. CHOOSE VISUALS — Match chart type to data shape:
   - Trend over time -> line chart
   - Compare categories -> bar chart (horizontal if >6 categories or long labels)
   - Part-to-whole (<=5 slices) -> donut chart; avoid pie/donut beyond 5 categories, use a bar chart instead
   - Relationship between two numeric variables -> scatter plot
   - Single important number (total revenue, growth %, count) -> KPI card, not a chart
   - Ranking -> sorted horizontal bar chart
6. BUILD DASHBOARD — Call dashboard_builder once with all chart specs
   and KPI cards together, arranged as:
   - Row 1: 3-4 KPI cards (the headline numbers)
   - Row 2-3: 2-3 charts per row, most important trend chart first
   - Consistent color palette across all charts (pass the same palette to every chart_generator call)
7. NARRATE — After the dashboard renders, give a short summary: 2-4
   sentences covering the single most important finding, one notable
   anomaly or risk, and one actionable next step. Do not restate every
   number already visible on the dashboard.

## OUTPUT RULES
- Every number in your narration must trace back to a code_executor
  result. If you can't verify it, say so instead of guessing.
- Keep prose concise — the dashboard carries the detail, your text
  carries the "so what."
- If the dataset is too large to reason about directly, work from
  data_profiler's summary and push full computation to code_executor;
  never ask the LLM context window to hold raw rows for math.
- If a request would require exposing sensitive columns (PII, salaries,
  etc.) beyond what's needed to answer the question, aggregate or mask
  before displaying.
- If data is insufficient to answer confidently, state the limitation
  plainly rather than filling the gap with a plausible-sounding number.
```

---

## 2. Recommended Flowise Node Architecture

```text
[Chat / Form Input] ---> [File Upload (CSV/Excel) or SQL Connector]
        |
        v
[Tool Agent / AgentFlow Agent] <--- System Prompt from Section 1
   |        |            |
   |        |            +--- [Buffer Memory] (Retains dataset & conversation context)
   |        |
   |        +--- 5 Attached Custom Tools:
   |              1. data_profiler       (Custom Tool: inspects schema, nulls, summary)
   |              2. code_executor        (Custom Tool: sandboxed Python/pandas engine)
   |              3. chart_generator      (Custom Tool: Chart.js / QuickChart rendering)
   |              4. dashboard_builder    (Custom Tool: Power BI-style CSS Grid layout)
   |              5. sql_query            (Custom Tool: AST read-only SELECT runner)
   v
[Chat Output] ---> Renders the HTML Dashboard + Executive Narration inline
```

### Architecture Key Points:
1. **Tool Agent Node**: Use a `Tool Agent` (or AgentFlow `Agent` node) rather than a plain `Conversation Chain` so the LLM dynamically decides which tools to invoke and in what order.
2. **Buffer Memory**: Connect a `BufferMemory` node to preserve the dataset reference and schema across multi-turn user questions.
3. **Structured Output Parser**: Add a Structured Output parser on the chart-selection step if you want guaranteed-consistent JSON (`chartType`, `labels`, `values`, `title`) before it reaches `chart_generator`.

---

## 3. Custom Tool Code Reference

### Tool 1: `chart_generator` (QuickChart.io / Inline Chart.js)
```javascript
// Flowise Custom Tool: chart_generator
const axios = require('axios');

const chartConfig = {
  type: $chartType, // 'bar' | 'line' | 'doughnut' | 'scatter'
  data: {
    labels: $labels,
    datasets: [{
      label: $seriesLabel || 'Metric',
      data: $values,
      backgroundColor: $colors || ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2']
    }]
  },
  options: {
    responsive: true,
    plugins: {
      title: { display: true, text: $title },
      legend: { display: $chartType === 'doughnut' }
    }
  }
};

const response = await axios.get('https://quickchart.io/chart', {
  params: {
    c: JSON.stringify(chartConfig),
    width: 580,
    height: 320,
    backgroundColor: 'white'
  },
  responseType: 'arraybuffer'
});

const base64 = Buffer.from(response.data).toString('base64');
return `![${$title}](data:image/png;base64,${base64})`;
```

### Tool 2: `code_executor` (Python Pandas Sandbox)
```javascript
// Flowise Custom Tool: code_executor (Sandboxed E2B / Riza)
const { CodeInterpreter } = require('@e2b/code-interpreter');

const sandbox = await CodeInterpreter.create({ apiKey: process.env.E2B_API_KEY });
try {
  const execution = await sandbox.notebook.execCell(`
import pandas as pd
import numpy as np

df = pd.read_csv('${$datasetPath}')
${$pythonSnippet}
`);
  return execution.text || JSON.stringify(execution.results);
} finally {
  await sandbox.close();
}
```

### Tool 3: `dashboard_builder` (Power BI CSS Grid Assembler)
```javascript
// Flowise Custom Tool: dashboard_builder
const kpiCards = ($kpis || []).map(k => `
  <div style="background:#ffffff;border-radius:10px;padding:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">${k.label}</div>
    <div style="font-size:24px;font-weight:800;color:#0f172a;margin-top:4px;">${k.value}</div>
    ${k.change ? `<div style="font-size:11px;font-weight:700;color:${k.change.startsWith('+') ? '#16a34a' : '#dc2626'};margin-top:2px;">${k.change} vs Prev Period</div>` : ''}
  </div>
`).join('');

const chartBlocks = ($charts || []).map(c => `
  <div style="background:#ffffff;border-radius:10px;padding:14px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    ${c.html || c}
  </div>
`).join('');

return `
<div style="font-family:Inter,Segoe UI,sans-serif;max-width:1000px;margin:0 auto;">
  <!-- Row 1: Headline KPI Cards (4 columns) -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
    ${kpiCards}
  </div>
  <!-- Row 2-3: Multi-Chart Visualization Grid (2 columns) -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:14px;margin-top:14px;">
    ${chartBlocks}
  </div>
</div>
`;
```

### Tool 4: `data_profiler`
```javascript
// Flowise Custom Tool: data_profiler
const fs = require('fs');
const Papa = require('papaparse');

const csvData = fs.readFileSync($filePath, 'utf8');
const parsed = Papa.parse(csvData, { header: true, dynamicTyping: true });
const rows = parsed.data.filter(r => Object.keys(r).length > 0);
const columns = Object.keys(rows[0] || {});

const nulls = {};
columns.forEach(col => {
  nulls[col] = rows.filter(r => r[col] === null || r[col] === undefined || r[col] === '').length;
});

return JSON.stringify({
  rowCount: rows.length,
  columnCount: columns.length,
  columns: columns,
  nullCounts: nulls,
  sample: rows.slice(0, 3)
});
```

### Tool 5: `sql_query` (Read-Only SQL Connector)
```javascript
// Flowise Custom Tool: sql_query
const { Client } = require('pg');

const sanitized = $query.trim();
if (!sanitized.toLowerCase().startsWith('select')) {
  throw new Error('AST Security Exception: Only read-only SELECT queries are allowed.');
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const res = await client.query(sanitized);
  return JSON.stringify({
    rowCount: res.rowCount,
    columns: res.fields.map(f => f.name),
    rows: res.rows
  });
} finally {
  await client.end();
}
```

---

## 4. Real Power BI Output vs Inline Look-Alike
- **Inline HTML Dashboard (Recommended)**:
  Produces interactive, inline look-alike KPI cards and charts directly inside the Flowise chat interface using CSS Grid and Chart.js/QuickChart. Zero external licensing or Azure AD required.
- **Real Power BI Service / .pbix Integration**:
  If stakeholders require live .pbix files or updates inside Power BI Service workspaces:
  1. **Power BI REST API (Push Datasets)**: Replace `dashboard_builder` with an API call to `https://api.powerbi.com/v1.0/myorg/datasets/{datasetId}/tables/{tableName}/rows`. Power BI Desktop reports connected to this push dataset automatically refresh.
  2. **Power BI Embedded**: Embed reports using Azure Active Directory App Registration and `@powerbi/report-embed` within your React frontend.

---

## 5. End-to-End Execution Trace
1. **User Action**: Uploads `sales_data.csv` and asks *"Analyze this data and create a dashboard."*
2. **Step 1 (Ingest)**: Agent detects upload, calls `data_profiler` -> detects 1,200 rows, columns: `[date, region, category, revenue, units, discount]`.
3. **Step 2 (Clarify & Plan)**: Agent infers key questions: Monthly revenue trend, revenue by region, top categories, and total units sold.
4. **Step 3 (Analyze)**: Agent calls `code_executor` -> executes pandas code to calculate exact sums, averages, and MoM growth rate.
5. **Step 4 (Choose Visuals)**:
   - Total Revenue & Total Units -> KPI Cards
   - Date vs Revenue -> Line Chart
   - Region vs Revenue -> Bar Chart
   - Category Breakdown -> Donut Chart
6. **Step 5 (Build Dashboard)**: Agent passes KPI cards and charts to `dashboard_builder`, rendering a unified Power BI CSS Grid.
7. **Step 6 (Narrate)**: Agent adds a 3-sentence executive takeaway highlighting top performing region, a negative margin outlier, and recommended next action.

