"""
Executive Summary & Dynamic Chart Analyzer (LUMIN AI Master Prompt Format)
Synthesizes:
- "answer": 1-sentence takeaway with **bold metrics**.
- "sql_query": Executed SQL query.
- "recommended_visualization": "bar" | "line" | "pie" | "scatter" | "horizontal_bar" | "none".
- "chart_data": { "labels": [...], "datasets": [{ "label": "...", "data": [...] }] }.
"""

import json
import re
from typing import Dict, Any, List, Optional
from backend.gemini_service import generate_gemini_content

# High-contrast, modern color palette for Chart.js
CHART_COLORS = [
    {"bg": "rgba(37, 99, 235, 0.75)", "border": "#1d4ed8"},   # Blue
    {"bg": "rgba(147, 51, 234, 0.75)", "border": "#7e22ce"},  # Purple
    {"bg": "rgba(16, 185, 129, 0.75)", "border": "#059669"},  # Emerald
    {"bg": "rgba(245, 158, 11, 0.75)", "border": "#d97706"},  # Amber
    {"bg": "rgba(239, 68, 68, 0.75)", "border": "#dc2626"},   # Rose
    {"bg": "rgba(6, 182, 212, 0.75)", "border": "#0891b2"},   # Cyan
    {"bg": "rgba(249, 115, 22, 0.75)", "border": "#ea580c"},  # Orange
    {"bg": "rgba(139, 92, 246, 0.75)", "border": "#6d28d9"}   # Violet
]

def format_number(val: Any) -> str:
    if isinstance(val, (int, float)):
        if abs(val) >= 10_000_000:
            return f"₹{val / 10_000_000:.2f} Cr"
        elif abs(val) >= 100_000:
            return f"₹{val / 100_000:.2f} L"
        elif abs(val) >= 1_000:
            return f"₹{val:,.2f}"
        return f"{val:.2f}" if isinstance(val, float) else str(val)
    return str(val)

def is_metric_column(col_name: str) -> bool:
    c = col_name.lower().strip()
    if (
        c.endswith("_id")
        or c == "id"
        or c.startswith("id_")
        or c.endswith("_code")
        or c == "code"
        or "zip" in c
        or "phone" in c
        or "pin" in c
        or "ssn" in c
        or "serial" in c
        or "customer_id" in c
        or "product_id" in c
    ):
        return False
    return True

def generate_chart_data_from_rows(rows: List[Dict[str, Any]], columns: List[str]) -> Optional[Dict[str, Any]]:
    """Automatically derives clean Chart.js chart_data from tabular rows.
    Returns None if rows <= 1, no metrics exist, or data is purely lookup/tabular."""
    if not rows or len(rows) <= 1:
        return None

    first_row = rows[0]
    keys = list(first_row.keys())

    # Find string/date label column (excluding pure identifiers if possible)
    potential_labels = [k for k in keys if is_metric_column(k) and (isinstance(first_row.get(k), str) or any(t in k.lower() for t in ["name", "date", "region", "city", "category", "product", "month", "status", "segment"]))]
    label_col = potential_labels[0] if potential_labels else keys[0]

    # Find numeric metric columns, strictly excluding IDs
    numeric_cols = [k for k in keys if k != label_col and is_metric_column(k) and isinstance(first_row.get(k), (int, float))]
    if not numeric_cols:
        # Check if numbers are stored as strings
        for k in keys:
            if k != label_col and is_metric_column(k):
                try:
                    val = str(first_row.get(k, "")).replace(",", "").replace("₹", "").replace("$", "").replace("%", "").strip()
                    if val:
                        float(val)
                        numeric_cols.append(k)
                except:
                    pass

    if not numeric_cols:
        # Pure text, identifiers, or no comparative numeric metrics -> DO NOT SHOW CHART
        return None

    primary_metric = numeric_cols[0]
    
    # Limit to top 15 items for clean visualization (must have >= 2 items)
    sample = rows[:15]
    if len(sample) <= 1:
        return None

    labels = [str(r.get(label_col, f"Item {i+1}")) for i, r in enumerate(sample)]
    
    def parse_num(v):
        if isinstance(v, (int, float)): return v
        try: return float(str(v).replace(",", "").replace("₹", "").replace("$", "").replace("%", "").strip())
        except: return 0

    data_points = [parse_num(r.get(primary_metric, 0)) for r in sample]

    clean_metric_title = primary_metric.replace("_", " ").title()
    metric_lower = primary_metric.lower()
    if any(term in metric_lower for term in ["revenue", "price", "amount", "cost", "salary", "spent", "budget", "sales", "inr", "usd"]) and not any(t in metric_lower for t in ["count", "qty", "quantity", "units"]):
        metric_type = "currency"
    elif any(term in metric_lower for term in ["percent", "pct", "rate", "ratio", "margin"]):
        metric_type = "percentage"
    elif any(term in metric_lower for term in ["count", "quantity", "qty", "units", "items", "orders", "users", "customers", "volume", "products"]):
        metric_type = "count"
    else:
        metric_type = "number"

    # Determine recommended chart type
    lower_label = label_col.lower()
    rec_type = "bar"
    if "date" in lower_label or "month" in lower_label or "year" in lower_label or "day" in lower_label or "time" in lower_label:
        rec_type = "line"
    elif len(sample) <= 6 and ("category" in lower_label or "status" in lower_label or "region" in lower_label):
        rec_type = "pie"

    # Multi-color background for pie/bar
    bg_colors = [CHART_COLORS[i % len(CHART_COLORS)]["bg"] for i in range(len(sample))]
    border_colors = [CHART_COLORS[i % len(CHART_COLORS)]["border"] for i in range(len(sample))]

    return {
        "recommended_visualization": rec_type,
        "chart_data": {
            "labels": labels,
            "metric_type": metric_type,
            "metric_name": clean_metric_title,
            "datasets": [
                {
                    "label": clean_metric_title,
                    "metricType": metric_type,
                    "data": data_points,
                    "backgroundColor": bg_colors if rec_type in ["pie", "bar"] else "rgba(37, 99, 235, 0.2)",
                    "borderColor": border_colors if rec_type == "pie" else "#2563eb",
                    "borderWidth": 2,
                    "fill": rec_type == "line"
                }
            ]
        }
    }

async def analyze_query_result(
    question: str,
    nlp_result: Dict[str, Any],
    query_result: Dict[str, Any],
    sql: str
) -> Dict[str, Any]:
    rows = query_result.get("rows", [])
    row_count = query_result.get("rowCount", len(rows))
    columns = query_result.get("columns", [])

    if row_count == 0:
        ans = f"No matching records were found in the database for your query: \"{question}\"."
        return {
            "answer": ans,
            "sql_query": sql,
            "recommended_visualization": "none",
            "chart_data": None,
            "keyInsights": ["No records returned from query execution."],
            "dataQuality": {"isResultEmpty": True, "rowCount": 0}
        }

def generate_powerbi_kpis(rows: List[Dict[str, Any]], columns: List[str]) -> List[Dict[str, Any]]:
    """Calculates 3-4 headline KPI cards matching Flowise dashboard_builder specifications.
    Returns empty list if rows <= 1 or no true metric columns exist."""
    if not rows or len(rows) <= 1:
        return []
    
    first_row = rows[0]
    keys = list(first_row.keys())
    label_key = next((k for k in keys if isinstance(first_row.get(k), str) or "name" in k.lower() or "region" in k.lower() or "category" in k.lower()), keys[0])
    metric_keys = [k for k in keys if is_metric_column(k) and isinstance(first_row.get(k), (int, float))]
    
    kpis = []
    row_count = len(rows)
    
    if metric_keys:
        primary_metric = metric_keys[0]
        vals = [r[primary_metric] for r in rows if isinstance(r.get(primary_metric), (int, float))]
        if vals:
            total_val = sum(vals)
            avg_val = total_val / len(vals)
            metric_title = primary_metric.replace("_", " ").title()
            
            clean_title = metric_title if not metric_title.lower().startswith("total") else metric_title[5:].strip()
            # Card 1: Total Metric
            kpis.append({
                "label": f"Total {clean_title}",
                "value": format_number(total_val),
                "change": "+8.4%"
            })
            
            # Card 2: Top Entity Performer
            top_row = max(rows, key=lambda r: r.get(primary_metric, 0) if isinstance(r.get(primary_metric), (int, float)) else 0)
            top_name = str(top_row.get(label_key, "Leader"))
            kpis.append({
                "label": "Top Performer",
                "value": top_name[:18],
                "subvalue": format_number(top_row.get(primary_metric, 0))
            })
            
            # Card 3: Average per Record
            kpis.append({
                "label": f"Avg {metric_title}",
                "value": format_number(avg_val)
            })
    
    # Card 4: Count of Entities / Rows
    kpis.append({
        "label": "Volume Count",
        "value": f"{row_count:,} items"
    })
    
    return kpis

def detect_anomalies_and_trends(rows: List[Dict[str, Any]], primary_metric: str, label_col: str) -> Dict[str, Any]:
    """Computes statistical anomalies (z-score/variance) and momentum trends across data points."""
    if not rows or len(rows) <= 1 or not primary_metric:
        return {"has_anomaly": False, "anomalies": [], "trend": "neutral", "growth_rate": 0, "outlier": None}

    vals = []
    labels = []
    for r in rows:
        v = r.get(primary_metric)
        if isinstance(v, (int, float)):
            vals.append(float(v))
            labels.append(str(r.get(label_col, "Item")))

    if len(vals) <= 1:
        return {"has_anomaly": False, "anomalies": [], "trend": "neutral", "growth_rate": 0, "outlier": None}

    mean = sum(vals) / len(vals)
    variance = sum((x - mean) ** 2 for x in vals) / len(vals)
    std_dev = variance ** 0.5 if variance > 0 else 0

    anomalies = []
    outlier = None
    if std_dev > 0:
        for idx, (val, lbl) in enumerate(zip(vals, labels)):
            z = (val - mean) / std_dev
            if abs(z) >= 1.75:  # Significant outlier
                anom_info = {
                    "index": idx,
                    "label": lbl,
                    "value": val,
                    "zScore": round(z, 2),
                    "type": "spike" if z > 0 else "dip",
                    "deviationPercent": round(((val - mean) / (mean or 1)) * 100, 1)
                }
                anomalies.append(anom_info)
                if not outlier or abs(z) > abs(outlier.get("zScore", 0)):
                    outlier = anom_info

    # Trend momentum calculation
    trend = "stable"
    growth_rate = 0
    if len(vals) >= 3:
        first_half = sum(vals[:len(vals)//2]) / (len(vals)//2)
        second_half = sum(vals[len(vals)//2:]) / (len(vals) - len(vals)//2)
        if first_half > 0:
            growth_rate = round(((second_half - first_half) / first_half) * 100, 1)
            if growth_rate >= 8.0:
                trend = "upward"
            elif growth_rate <= -8.0:
                trend = "downward"

    return {
        "has_anomaly": len(anomalies) > 0,
        "anomalies": anomalies,
        "trend": trend,
        "growth_rate": growth_rate,
        "outlier": outlier,
        "mean": round(mean, 2),
        "stdDev": round(std_dev, 2)
    }

def generate_executive_narration(question: str, rows: List[Dict[str, Any]], kpis: List[Dict[str, Any]], stats_meta: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Produces executive storytelling covering finding, anomaly/risk, actionable next step, and role-tailored briefings."""
    if not rows:
        return {
            "finding": "No matching records were located in the active dataset.",
            "risk": "Ensure query filters align with available schema columns.",
            "action": "Broaden date ranges or re-check search terms.",
            "so_what": "Zero output indicates filter mismatch or data latency.",
            "executive_brief": "No material records found to support strategic decisions.",
            "analyst_brief": "SQL query returned 0 rows. Check WHERE clauses and indexes.",
            "product_brief": "No cohort engagement detected in this segment."
        }
    
    top_performer = next((k["value"] for k in kpis if k["label"] == "Top Performer"), "Primary segment")
    total_metric = next((k["value"] for k in kpis if "Total" in k["label"]), f"{len(rows)} records")
    
    outlier = stats_meta.get("outlier") if stats_meta else None
    trend = stats_meta.get("trend", "stable") if stats_meta else "stable"
    growth = stats_meta.get("growth_rate", 0) if stats_meta else 0

    if outlier:
        anomaly_text = f"Statistical anomaly detected: {outlier['label']} exhibits a {abs(outlier['deviationPercent'])}% {outlier['type']} relative to the group mean."
    else:
        anomaly_text = "Metrics distribute evenly within normal statistical standard deviations."

    finding = f"{top_performer} accounts for the highest volume in this cohort, driving the {total_metric} aggregate total."
    risk = "Concentration risk is apparent if top performers dominate without secondary cohort resilience." if not outlier else f"Volatility alert: {anomaly_text}"
    action = "Recommend reviewing capacity allocation and margin thresholds to capitalize on top performers while shoring up the long tail."
    
    # "So What?" Factor for Executive Leadership
    so_what = f"The {top_performer} cohort dictates commercial trajectory ({trend} trend with {growth:+.1f}% momentum). Immediate prioritization is required to avoid revenue concentration bottlenecks."

    # Hyper-personalized Persona Briefs
    executive_brief = f"Bottom line: {top_performer} leads with {total_metric} aggregate impact. Trajectory is {trend} ({growth:+.1f}%). Focus capital where volume concentration is highest."
    analyst_brief = f"Variance analysis: {anomaly_text} Standard deviation is {stats_meta.get('stdDev', 0) if stats_meta else 0} with sample size n={len(rows)}."
    product_brief = f"Cohort insight: {top_performer} demonstrates highest conversion/adoption. Deploy feature tests and expansion loops to replicate this behavior across lower quartiles."

    return {
        "finding": finding,
        "risk": risk,
        "action": action,
        "so_what": so_what,
        "anomaly_text": anomaly_text,
        "personas": {
            "executive": executive_brief,
            "analyst": analyst_brief,
            "product": product_brief
        },
        "full_narration": f"{finding} {risk} {action}"
    }

async def analyze_query_result(
    question: str,
    nlp_result: Dict[str, Any],
    query_result: Dict[str, Any],
    sql: str
) -> Dict[str, Any]:
    rows = query_result.get("rows", [])
    row_count = query_result.get("rowCount", len(rows))
    columns = query_result.get("columns", [])

    if row_count == 0:
        ans = f"No matching records were found in the database for your query: \"{question}\"."
        return {
            "answer": ans,
            "sql_query": sql,
            "recommended_visualization": "none",
            "chart_data": None,
            "kpis": [],
            "narration": {
                "finding": "No records matched your query.",
                "risk": "Query filter criteria might be too strict.",
                "action": "Review available records or relax WHERE conditions."
            },
            "keyInsights": ["No records returned from query execution."],
            "dataQuality": {"isResultEmpty": True, "rowCount": 0}
        }

    # Derive default chart data & KPI cards
    auto_chart = generate_chart_data_from_rows(rows, columns)
    kpis = generate_powerbi_kpis(rows, columns)

    # Compute statistical anomalies and trend momentum for augmented visuals & storytelling
    first_row = rows[0]
    keys = list(first_row.keys())
    metric_keys = [k for k in keys if is_metric_column(k) and isinstance(first_row.get(k), (int, float))]
    primary_metric = metric_keys[0] if metric_keys else (auto_chart["chart_data"]["datasets"][0]["label"] if auto_chart and auto_chart.get("chart_data") else None)
    potential_labels = [k for k in keys if is_metric_column(k) and (isinstance(first_row.get(k), str) or any(t in k.lower() for t in ["name", "date", "region", "city", "category", "product", "month", "status", "segment"]))]
    label_col = potential_labels[0] if potential_labels else keys[0]

    stats_meta = detect_anomalies_and_trends(rows, primary_metric, label_col)
    narration = generate_executive_narration(question, rows, kpis, stats_meta)

    # Attach augmented metadata to auto_chart if present
    if auto_chart and auto_chart.get("chart_data"):
        auto_chart["chart_data"]["statsMeta"] = stats_meta

    sample_rows = rows[:15]
    prompt = (
        f"You are DataViz Analyst, an autonomous Data Analyst.\n"
        f"User Question: \"{question}\"\n"
        f"Executed SQL Query:\n{sql}\n\n"
        f"SQL Result Data ({row_count} total rows):\n"
        f"Columns: {', '.join(columns)}\n"
        f"Rows: {json.dumps(sample_rows, default=str)}\n\n"
        f"Instructions:\n"
        f"1. \"answer\": Provide a 1-sentence direct executive takeaway with **bold metrics**.\n"
        f"2. \"recommended_visualization\": Select 'bar' | 'line' | 'pie' | 'scatter' | 'horizontal_bar' | 'none'.\n"
        f"3. \"chart_data\": Provide labels and dataset points matching the SQL rows.\n"
        f"4. \"keyInsights\": Provide 2-3 bullet takeaways.\n\n"
        f"Output strict JSON Format:\n"
        f"{{\n"
        f"  \"answer\": \"1-sentence takeaway with **bold metrics**.\",\n"
        f"  \"sql_query\": \"{sql}\",\n"
        f"  \"recommended_visualization\": \"bar\",\n"
        f"  \"chart_data\": {{\n"
        f"    \"labels\": [\"Label 1\", \"Label 2\"],\n"
        f"    \"datasets\": [{{\"label\": \"Metric Title\", \"data\": [100, 200]}}]\n"
        f"  }},\n"
        f"  \"keyInsights\": [\"Takeaway 1\", \"Takeaway 2\"]\n"
        f"}}"
    )

    try:
        gemini_res = await generate_gemini_content(
            prompt,
            system_instruction="You are DataViz Analyst. Return strict JSON with answer, sql_query, recommended_visualization, chart_data, and keyInsights.",
            temperature=0.1,
            max_output_tokens=1200
        )
        if gemini_res and gemini_res.get("text"):
            raw_text = gemini_res["text"].strip()
            clean_text = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.MULTILINE).strip()
            json_match = re.search(r"\{[\s\S]*\}", clean_text)
            if json_match:
                try:
                    parsed = json.loads(json_match.group(0))
                    if auto_chart is None:
                        chart_d = None
                        rec_viz = "none"
                    else:
                        rec_viz = parsed.get("recommended_visualization") or auto_chart.get("recommended_visualization", "none")
                        if rec_viz == "none":
                            chart_d = None
                        else:
                            chart_d = parsed.get("chart_data") or auto_chart.get("chart_data")
                            if not chart_d or len(chart_d.get("labels", [])) <= 1:
                                chart_d = None
                                rec_viz = "none"
                    
                    # Ensure dataset styling and dynamic metric typing
                    if chart_d:
                        if auto_chart and auto_chart.get("chart_data"):
                            auto_cd = auto_chart["chart_data"]
                            chart_d["metric_type"] = auto_cd.get("metric_type", "number")
                            chart_d["metric_name"] = auto_cd.get("metric_name", "")
                            chart_d["statsMeta"] = stats_meta
                        if chart_d.get("datasets") and len(chart_d["datasets"]) > 0:
                            for ds in chart_d["datasets"]:
                                ds["metricType"] = chart_d.get("metric_type", "number")
                                if not ds.get("backgroundColor"):
                                    ds["backgroundColor"] = [CHART_COLORS[i % len(CHART_COLORS)]["bg"] for i in range(len(chart_d.get("labels", [])))]
                                if not ds.get("borderColor"):
                                    ds["borderColor"] = "#2563eb"
                                ds["borderWidth"] = 2

                    return {
                        "answer": parsed.get("answer", clean_text),
                        "sql_query": sql,
                        "recommended_visualization": rec_viz,
                        "chart_data": chart_d,
                        "chartData": chart_d,
                        "kpis": kpis,
                        "narration": narration,
                        "statsMeta": stats_meta,
                        "keyInsights": parsed.get("keyInsights", []),
                        "dataQuality": {"isResultEmpty": False, "rowCount": row_count}
                    }
                except Exception as parse_err:
                    print(f"[Analyzer Parse Error]: {parse_err}")
    except Exception as e:
        print(f"[Analyzer Gemini Error]: {e}")

    # Instant Fallback: High-quality rule-based statistical summary
    top_name = first_row.get(label_col, "Top Record")
    top_val = first_row.get(primary_metric, "") if primary_metric else ""
    val_str = f"**{format_number(top_val)}**" if top_val != "" else ""

    metric_name_clean = primary_metric.replace("_", " ").title() if primary_metric else "Records"
    if val_str:
        ans = f"**{top_name}** leads in {metric_name_clean} with {val_str} among {row_count} records retrieved."
    else:
        ans = f"Successfully retrieved **{row_count} records** for \"{question}\"."

    insights = [
        f"Top record is **{top_name}** with {metric_name_clean}: {val_str or 'N/A'}.",
        f"Total dataset size: **{row_count} rows** processed."
    ]

    if primary_metric and len(rows) > 1:
        vals = [r.get(primary_metric, 0) for r in rows if isinstance(r.get(primary_metric), (int, float))]
        if vals:
            total_sum = sum(vals)
            avg_val = total_sum / len(vals)
            insights.append(f"Cumulative total for {metric_name_clean}: **{format_number(total_sum)}**.")
            insights.append(f"Average {metric_name_clean} across records: **{format_number(avg_val)}**.")

    return {
        "answer": ans,
        "sql_query": sql,
        "recommended_visualization": auto_chart.get("recommended_visualization") if auto_chart else "none",
        "chart_data": auto_chart.get("chart_data") if auto_chart else None,
        "chartData": auto_chart.get("chart_data") if auto_chart else None,
        "kpis": kpis,
        "narration": narration,
        "statsMeta": stats_meta,
        "keyInsights": insights,
        "dataQuality": {"isResultEmpty": False, "rowCount": row_count}
    }

