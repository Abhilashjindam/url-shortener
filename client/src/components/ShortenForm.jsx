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
  const [longUrl, setLongUrl]   = useState('');
  const [alias, setAlias]       = useState('');   // new — custom alias input
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [copied, setCopied]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      // Build the request body
      // If alias is filled in, include it — otherwise just send longUrl
      const body = { longUrl: trimmed };
      if (alias.trim()) {
        body.alias = alias.trim();
      }

      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        return;
      }

      setResult(data);
      onNewUrl(data);
      setLongUrl('');
      setAlias('');  // clear alias input after success

    } catch (err) {
      setError("Cannot reach the server. Make sure it's running on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

          {/* Custom alias input — optional */}
          <div className="alias-row">
            <span className="alias-prefix">
              {window.location.hostname === 'localhost'
                ? 'localhost:5000/'
                : window.location.hostname + '/'}
            </span>
            <input
              type="text"
              className="alias-input"
              placeholder="custom-alias (optional)"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              disabled={loading}
            />
          </div>
        </form>

        {error && <div className="error-msg">⚠ {error}</div>}

        {result && (
          <div className="result-box">
            <span className="result-badge">Ready to share</span>
            <div className="result-link-row">
              
              <a href={result.shortUrl}
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