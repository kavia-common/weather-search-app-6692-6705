const DEFAULT_BACKEND_URL = 'http://localhost:3001';

/**
 * Derive backend base URL from environment, falling back to localhost.
 * CRA exposes env vars prefixed with REACT_APP_.
 */
function getBackendBaseUrl() {
  return (process.env.REACT_APP_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/+$/, '');
}

/**
 * Attempt to parse error payloads from FastAPI, which typically respond with:
 * - { "detail": "..." } for HTTPException
 * - { "detail": [ {loc, msg, type}, ... ] } for 422 validation errors
 */
async function readFastApiErrorPayload(response) {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    const text = await response.text();
    return text ? { detail: text } : null;
  } catch {
    return null;
  }
}

/**
 * Convert an unsuccessful fetch Response into a user-friendly Error.
 * We keep messages actionable and map common backend statuses to specific guidance.
 */
async function responseToError(response) {
  const payload = await readFastApiErrorPayload(response);

  // Normalize detail into a string, if present.
  let detailText = '';
  const detail = payload?.detail;

  if (typeof detail === 'string') {
    detailText = detail;
  } else if (Array.isArray(detail) && detail.length > 0) {
    // 422 validation errors
    const first = detail[0];
    detailText = first?.msg || 'Invalid request.';
  } else if (payload?.message) {
    detailText = payload.message;
  }

  // Friendly error messages by status (aligned with backend OpenAPI)
  if (response.status === 400 || response.status === 422) {
    return new Error(detailText || 'Please enter a valid city name.');
  }

  if (response.status === 404) {
    return new Error('City not found. Please check the spelling and try again.');
  }

  if (response.status === 502) {
    return new Error('Weather provider is currently unreachable. Please try again in a moment.');
  }

  if (response.status >= 500) {
    // Common case: backend misconfiguration such as missing OpenWeather API key.
    // We avoid leaking server internals but provide guidance.
    return new Error(
      'Weather service is not configured or temporarily unavailable. If you are running locally, ensure the backend has a valid OpenWeather API key set.'
    );
  }

  const fallback = 'Unable to fetch weather data. Please try again.';
  return new Error(detailText ? `${fallback} (${detailText})` : fallback);
}

/**
 * Ensure returned JSON matches the backend WeatherResponse schema:
 * { city: string, temperature: number, humidity: number, description: string }
 */
function normalizeWeatherResponse(data) {
  if (!data || typeof data !== 'object') return null;

  return {
    city: typeof data.city === 'string' ? data.city : '',
    temperature: typeof data.temperature === 'number' ? data.temperature : Number(data.temperature),
    humidity: typeof data.humidity === 'number' ? data.humidity : Number(data.humidity),
    description: typeof data.description === 'string' ? data.description : ''
  };
}

// PUBLIC_INTERFACE
export async function getWeatherByCity(city) {
  /** Fetch current weather by city name from the backend.
   * @param {string} city - City name to query (e.g., "London")
   * @returns {Promise<{city: string, temperature: number, humidity: number, description: string}>}
   */
  const trimmed = (city || '').trim();
  if (!trimmed) {
    throw new Error('Please enter a city name.');
  }

  const baseUrl = getBackendBaseUrl();
  const url = new URL(`${baseUrl}/weather`);
  url.searchParams.set('city', trimmed);

  let response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
  } catch {
    throw new Error(
      'Cannot reach the weather service. Please check that the backend is running and try again.'
    );
  }

  if (!response.ok) {
    throw await responseToError(response);
  }

  const data = await response.json();
  const normalized = normalizeWeatherResponse(data);

  // If backend returns unexpected shape, provide safe error.
  if (!normalized || !normalized.city || !Number.isFinite(normalized.temperature)) {
    throw new Error('Received an unexpected response from the weather service.');
  }

  return normalized;
}
