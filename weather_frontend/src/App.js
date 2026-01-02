import React, { useMemo, useState } from 'react';
import './App.css';
import { getWeatherByCity } from './services/weatherApi';

// PUBLIC_INTERFACE
function App() {
  /** Main weather search application UI. */
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [weather, setWeather] = useState(null);

  const canSubmit = useMemo(() => city.trim().length > 0 && !loading, [city, loading]);

  // PUBLIC_INTERFACE
  const onSubmit = async (e) => {
    /** Handle city search submit. */
    e.preventDefault();
    setErrorText('');
    setWeather(null);

    try {
      setLoading(true);
      const data = await getWeatherByCity(city);
      setWeather(data);
    } catch (err) {
      setErrorText(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <main className="container">
        <section className="card" aria-label="Weather search">
          <header className="header">
            <h1 className="title">Weather Search</h1>
            <p className="subtitle">Enter a city name to get current conditions.</p>
          </header>

          <form onSubmit={onSubmit} aria-label="Search weather by city">
            <div className="fieldGroup">
              <label className="label" htmlFor="city-input">
                City
              </label>
              <div className="formRow">
                <input
                  id="city-input"
                  className="input"
                  type="text"
                  inputMode="text"
                  autoComplete="address-level2"
                  placeholder="e.g., San Francisco"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  aria-describedby="status-row"
                />
                <button className="button" type="submit" disabled={!canSubmit}>
                  {loading ? 'Searching…' : 'Search'}
                </button>
              </div>
            </div>

            <div id="status-row" className="helperRow" aria-live="polite">
              {loading && <span className="loading">Loading weather…</span>}
              {!loading && errorText && (
                <span className="error" role="alert">
                  {errorText}
                </span>
              )}
            </div>
          </form>

          {weather && (
            <section className="results" aria-label="Weather results">
              <h2 className="resultsTitle">Results</h2>

              <div className="kvGrid">
                <div className="kvRow">
                  <span className="key">City</span>
                  <span className="value">{weather.city || city.trim()}</span>
                </div>

                <div className="kvRow">
                  <span className="key">Temperature</span>
                  <span className="value">
                    {typeof weather.temperature === 'number'
                      ? `${Math.round(weather.temperature)}°C`
                      : '—'}
                  </span>
                </div>

                <div className="kvRow">
                  <span className="key">Humidity</span>
                  <span className="value">
                    {typeof weather.humidity === 'number' ? `${weather.humidity}%` : '—'}
                  </span>
                </div>

                <div className="kvRow">
                  <span className="key">Description</span>
                  <span className="value">{weather.description || '—'}</span>
                </div>
              </div>
            </section>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
