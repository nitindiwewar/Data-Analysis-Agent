"""
Google Gemini Service for Python FastAPI
Optimized with persistent connection pooling, keep-alive TLS reuse, and in-memory LRU response caching.
"""

import os
import time
import asyncio
import httpx
from typing import Optional, Dict, Any, List, Tuple
from dotenv import load_dotenv

load_dotenv()

_runtime_api_key: Optional[str] = None

# Active supported models in Google Gemini API v1beta (fastest & valid models first)
CANDIDATE_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite-preview",
    "gemini-3-flash-preview",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3.6-flash"
]

# Performance: Persistent Async Client with connection pooling
_client_instance: Optional[httpx.AsyncClient] = None

# Performance: In-memory query response cache (TTL: 600 seconds)
_prompt_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}
PROMPT_CACHE_TTL_SEC = 600.0

def get_http_client() -> httpx.AsyncClient:
    global _client_instance
    if _client_instance is None or _client_instance.is_closed:
        _client_instance = httpx.AsyncClient(
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=50, keepalive_expiry=30.0),
            timeout=httpx.Timeout(5.5, connect=2.0)
        )
    return _client_instance

async def close_http_client():
    global _client_instance
    if _client_instance and not _client_instance.is_closed:
        await _client_instance.aclose()
        _client_instance = None

def set_runtime_gemini_key(key: str) -> bool:
    global _runtime_api_key
    if key and key.strip():
        _runtime_api_key = key.strip()
        _prompt_cache.clear()
        return True
    return False

def get_gemini_api_key() -> Optional[str]:
    global _runtime_api_key
    if _runtime_api_key:
        return _runtime_api_key
    return os.environ.get("GEMINI_API_KEY") or None

def is_gemini_configured() -> bool:
    key = get_gemini_api_key()
    return bool(key and len(key) > 5)

async def generate_gemini_content(
    prompt: str,
    system_instruction: Optional[str] = None,
    temperature: float = 0.1,
    max_output_tokens: int = 1200
) -> Optional[Dict[str, Any]]:
    api_key = get_gemini_api_key()
    if not api_key:
        return None

    # Check cache for identical prompt & instruction
    cache_key = f"{prompt}::{system_instruction or ''}"
    now = time.time()
    if cache_key in _prompt_cache:
        cached_time, cached_val = _prompt_cache[cache_key]
        if (now - cached_time) < PROMPT_CACHE_TTL_SEC:
            return cached_val

    headers = {"Content-Type": "application/json"}
    payload: Dict[str, Any] = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_output_tokens
        }
    }
    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }

    client = get_http_client()

    for model in CANDIDATE_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                data = response.json()
                candidates = data.get("candidates", [])
                if candidates:
                    content_parts = candidates[0].get("content", {}).get("parts", [])
                    if content_parts:
                        text = content_parts[0].get("text", "")
                        result = {
                            "text": text,
                            "model": model
                        }
                        # Cache successful generation
                        if len(_prompt_cache) > 200:
                            oldest_key = min(_prompt_cache, key=lambda k: _prompt_cache[k][0])
                            _prompt_cache.pop(oldest_key, None)
                        _prompt_cache[cache_key] = (now, result)
                        return result
            elif response.status_code == 429:
                print(f"[Gemini 429 Rate Limit for {model}, immediately falling back to next candidate]")
                continue
            else:
                print(f"[Gemini API Error {response.status_code} on {model}]: {response.text[:200]}")
        except Exception as e:
            print(f"[Gemini Request Exception on {model}]: {str(e)}")
            continue

    return None
