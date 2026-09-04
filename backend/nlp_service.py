"""
NLP Question Understanding & Multilingual/Hinglish Entity Extractor in Python
"""

import re
from typing import Dict, Any, List

SYNONYMS_DICT = {
    "customer": ["customer", "customers", "user", "users", "client", "clients", "consumer", "consumers", "grahak", "buyer", "buyers", "account", "people"],
    "product": ["product", "products", "item", "items", "saman", "goods", "merchandise", "inventory", "stock", "hardware"],
    "region": ["region", "regions", "city", "cities", "state", "states", "location", "locations", "zone", "place"],
    "sale": ["sale", "sales", "order", "orders", "transaction", "transactions", "deal", "deals", "purchase", "purchases"],
    "revenue": ["revenue", "turnover", "income", "bikri", "kamai", "total sales", "gross"],
    "profit": ["profit", "net profit", "margin", "earnings", "munafa", "fayda", "bachat"],
    "cost": ["cost", "cogs", "expenses", "spend", "kharcha", "laagat"],
    "quantity": ["quantity", "volume", "units", "units sold", "kitna", "kitne", "count"],
    "price": ["price", "unit price", "cost per unit", "daam", "rate", "keemat"],
    "mrr": ["mrr", "monthly recurring revenue", "recurring revenue", "monthly revenue"],
    "specialty": ["specialty", "department", "doctor type", "field"],
    "top": ["top", "highest", "best", "leading", "sabse zyada", "sabse upar", "maximum"],
    "bottom": ["bottom", "lowest", "least", "sabse kam", "minimum"]
}

def analyze_question_nlp(question: str) -> Dict[str, Any]:
    lower_q = question.lower().strip()
    
    # 1. Intent Detection
    intent = "general_analysis"
    if any(w in lower_q for w in ["top", "highest", "best", "sabse zyada", "rank"]):
        intent = "ranking_top_n"
    elif any(w in lower_q for w in ["compare", "versus", "vs", "breakdown", "across"]):
        intent = "comparison_aggregation"
    elif any(w in lower_q for w in ["low", "below", "stock", "inventory", "alert", "kam"]):
        intent = "filtering_threshold"
    elif any(w in lower_q for w in ["total", "sum", "overall", "kitna", "kitne", "count"]):
        intent = "aggregation_summary"

    # 2. Metric Extraction
    matched_metrics = []
    for metric_name, syns in SYNONYMS_DICT.items():
        for syn in syns:
            if re.search(r'\b' + re.escape(syn) + r'\b', lower_q):
                matched_metrics.append(metric_name)
                break

    # 3. Entity Extraction
    entities = []
    # Numbers
    num_matches = re.findall(r'\b(\d+)\b', lower_q)
    for n in num_matches:
        entities.append({"phrase": n, "type": "NUMBER", "canonicalValue": int(n)})

    # Product names / categories
    known_products = [
        "MacBook Pro 16", "Dell XPS 15", "iPhone 16 Pro", "Samsung Galaxy S24 Ultra",
        "Sony WH-1000XM5", "AirPods Max", "LG UltraFine 32 Monitor", "Logitech MX Master 3S",
        "Keychron Q3 Pro Keyboard", "Lenovo ThinkPad X1"
    ]
    for p in known_products:
        if p.lower() in lower_q:
            entities.append({"phrase": p, "type": "PRODUCT_NAME", "canonicalValue": p})

    # Regions / Cities
    known_regions = ["West India", "South India", "North India", "Telangana & AP", "East India", "Central India", "Mumbai", "Bangalore", "Delhi", "Gurgaon", "Chennai", "Hyderabad"]
    for r in known_regions:
        if r.lower() in lower_q:
            entities.append({"phrase": r, "type": "GEOGRAPHIC_LOCATION", "canonicalValue": r})

    return {
        "question": question,
        "normalizedQuery": lower_q,
        "intent": intent,
        "secondaryIntents": [],
        "metrics": list(set(matched_metrics)),
        "entities": entities,
        "filters": {}
    }
