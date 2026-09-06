// Centralized Production & Development API Base URL helper
export const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '';

export const getApiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${cleanEndpoint}`;
};

export const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : window.location.origin;

/**
 * Defensive JSON fetch helper.
 * Verifies Content-Type before parsing JSON, preventing SyntaxError "Unexpected token '<'".
 * Differentiates network failures, HTTP status codes, and backend error messages.
 */
export const safeFetchJson = async (endpoint, options = {}) => {
  const fullUrl = getApiUrl(endpoint);
  let res;
  try {
    res = await fetch(fullUrl, options);
  } catch (err) {
    console.error(`❌ Network error fetching ${fullUrl}:`, err);
    throw new Error(`Could not reach API: ${fullUrl}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let data = null;
  let rawText = '';

  if (isJson) {
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
  } else {
    rawText = await res.text();
    console.error(`⚠️ Non-JSON API response [${res.status}] from ${fullUrl}:`, rawText.substring(0, 300));
  }

  if (!res.ok) {
    const backendMsg = data?.message || data?.error || data?.details;
    if (res.status === 400) {
      throw new Error(backendMsg || 'Validation error (400)');
    } else if (res.status === 401) {
      throw new Error(backendMsg || 'Authentication failed (401)');
    } else if (res.status === 403) {
      throw new Error(backendMsg || 'Not authorized (403)');
    } else if (res.status === 404) {
      throw new Error(backendMsg ? `API returned 404: ${backendMsg}` : `API returned 404: Endpoint not found (${fullUrl})`);
    } else if (res.status === 409) {
      throw new Error(backendMsg || 'Resource conflict (409)');
    } else if (!isJson) {
      throw new Error(`API returned non-JSON response [HTTP ${res.status}] at ${fullUrl}`);
    } else {
      throw new Error(backendMsg ? `Backend error (${res.status}): ${backendMsg}` : `Backend error (${res.status})`);
    }
  }

  if (!isJson) {
    throw new Error(`API returned non-JSON response [HTTP ${res.status}] at ${fullUrl}`);
  }

  return data;
};
