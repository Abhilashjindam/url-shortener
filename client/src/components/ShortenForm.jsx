/*
 * ShortenForm.jsx — The Main Input Component
 *
 * KEY CONCEPTS IN THIS FILE:
 *
 * 1. CONTROLLED INPUT:
 *    In React, form inputs are either "controlled" or "uncontrolled".
 *    Controlled = React state drives the input value. Every keystroke
 *    updates state, and state keeps the input in sync.
 *    <input value={longUrl} onChange={(e) => setLongUrl(e.target.value)} />
 *    This is the standard React way — always prefer controlled inputs.
 *
 * 2. EVENT HANDLING:
 *    e.preventDefault() stops the browser's default form submit behavior
 *    (which would refresh the page). We handle submission ourselves via fetch().
 *
 * 3. FETCH API:
 *    Built-in browser API for making HTTP requests.
 *    POST request with a JSON body = fetch(url, { method, headers, body })
 *    Always JSON.stringify() the body — you can't send a JS object over HTTP,
 *    only a string.
 *
 * 4. ASYNC/AWAIT:
 *    fetch() is asynchronous — it returns a Promise.
 *    await pauses execution until the Promise resolves.
 *    try/catch handles errors (network failures, server errors).
 *
 * 5. CLIPBOARD API:
 *    navigator.clipboard.writeText() copies text to the system clipboard.
 *    We give user feedback by toggling the "Copied!" state for 2 seconds.
 */

import { useState } from 'react';

function ShortenForm({ onNewUrl }) {
  const [longUrl, setLongUrl]   = useState('');  // What the user types
  const [result, setResult]     = useState(null); // The API response (shortened URL)
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [copied, setCopied]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent page refresh on form submit

    const trimmed = longUrl.trim();
    if (!trimmed) {
      setError('Please paste a URL first.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setCopied(false);

    try {
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Tell the server we're sending JSON
        },
        body: JSON.stringify({ longUrl: trimmed }), // Convert JS object → JSON string
      });

      const data = await res.json(); // Parse the JSON response → JS object

      if (!res.ok) {
        // Server returned an error (400, 404, 500, etc.)
        setError(data.error || 'Something went wrong.');
        return;
      }

      setResult(data);
      onNewUrl(data); // Notify parent (App.jsx) so it updates the history list
      setLongUrl('');  // Clear the input after success

    } catch (err) {
      // Network error — server probably not running
      setError('Cannot reach the server. Make sure it\'s running on port 5000.');
    } finally {
      setLoading(false); // Always runs, success or failure
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset button after 2 seconds
    } catch {
      // Fallback for browsers that block clipboard without HTTPS
      alert('Copy failed — try selecting and copying manually.');
    }
  };

  return (
    <section>
      <div className="card shorten-card">
        <p className="card-label">Paste your URL</p>

        <form onSubmit={handleSubmit}>
          <div className="input-row">
            <input
              type="text"
              className="url-input"
              placeholder="https://example.com/some/very/long/url..."
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Working…' : 'Shorten →'}
            </button>
          </div>
        </form>

        {error && <div className="error-msg">⚠ {error}</div>}

        {result && (
          <div className="result-box">
            <span className="result-badge">Ready to share</span>
            <div className="result-link-row">
              <a
                href={result.shortUrl}
                target="_blank"
                rel="noreferrer"
                className="result-short-url"
              >
                {result.shortUrl}
              </a>
              <button
                onClick={handleCopy}
                className={`btn btn-copy ${copied ? 'is-copied' : ''}`}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="result-original" title={result.longUrl}>
              ↩ {result.longUrl}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default ShortenForm;
