const DEFAULT_BACKEND_URL = 'http://localhost:3001';

/**
 * Derive backend base URL from environment, falling back to localhost.
 * CRA exposes env vars prefixed with REACT_APP_.
 */
function getBackendBaseUrl() {
  return (process.env.REACT_APP_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/+$/, '');
}

/**
 * Convert an unsuccessful fetch Response into a user-friendly Error.
 * We attempt to read JSON or text, but always return a safe message.
 */
async function responseToError(response) {
  let details = '';
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      details = data?.detail || data?.message || JSON.stringify(data);
    } else {
      details = await response.text();
    }
  } catch {
    // ignore parsing errors
  }

  // Friendly error messages by status
  if (response.status === 404) {
    return new Error('City not found. Please check the spelling and try again.');
  }
  if (response.status === 429) {
    return new Error('Too many requests. Please wait a moment and try again.');
  }
  if (response.status >= 500) {
    return new Error('Weather service is currently unavailable. Please try again later.');
  }

  const fallback = 'Unable to fetch weather data. Please try again.';
  return new Error(details ? `${fallback} (${details})` : fallback);
}

// PUBLIC_INTERFACE
export async function getWeatherByCity(city) {
  /** Fetch current weather by city name from the backend.
   * @param {string} city - City name to query (e.g., "London")
   * @returns {Promise<Object>} Weather payload from backend
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
    throw new Error('Cannot reach the weather service. Please check your connection and try again.');
  }

  if (!response.ok) {
    throw await responseToError(response);
  }

  return response.json();
}
