/*
 * UrlCard.jsx — Individual URL Entry
 *
 * DISPLAYS:
 *   - Short URL (clickable link)
 *   - Original long URL (truncated)
 *   - Click count
 *   - Days until expiry
 *   - Copy button
 *   - Delete button
 *
 * CONCEPTS:
 *
 * DATE MATH:
 *   JavaScript Date objects let you do arithmetic.
 *   createdAt + 7 days - now = milliseconds remaining
 *   Convert to days by dividing by (1000 ms * 60 s * 60 min * 24 hr)
 *
 * OPTIMISTIC UI:
 *   When the user clicks Delete, we immediately show the card fading out
 *   BEFORE the API call completes. This makes the app feel snappy.
 *   If the API call fails, we could reverse it — but for simplicity we don't here.
 *
 * WINDOW.CONFIRM:
 *   Simple browser built-in confirmation dialog.
 *   In a production app you'd build a custom modal, but this is fine for a portfolio.
 */

import { useState } from 'react';

function UrlCard({ url, onDelete }) {
  const [copied, setCopied]     = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Copy to clipboard ──
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Could not copy — try manually selecting the link.');
    }
  };

  // ── Delete URL ──
  const handleDelete = async () => {
    if (!window.confirm('Delete this link permanently?')) return;

    setDeleting(true); // Start fading the card immediately (optimistic UI)

    try {
      const res = await fetch(`/api/urls/${url._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      onDelete(url._id); // Tell parent (App.jsx) to remove it from state
    } catch {
      alert('Could not delete. Try again.');
      setDeleting(false); // Restore the card if deletion failed
    }
  };

  // ── Expiry calculation ──
  // MongoDB stores createdAt, and we set TTL to 7 days.
  // We compute the same 7-day window to show the user how much time is left.
  const createdAt  = new Date(url.createdAt);
  const expiresAt  = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const msLeft     = expiresAt - Date.now();
  const daysLeft   = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

  return (
    <div className={`card url-card ${deleting ? 'is-deleting' : ''}`}>
      <div className="url-card-top">

        {/* Left: URLs */}
        <div className="url-card-info">
          <a
            href={url.shortUrl}
            target="_blank"
            rel="noreferrer"
            className="url-short-link"
          >
            {url.shortUrl}
          </a>
          <p className="url-long" title={url.longUrl}>
            {url.longUrl}
          </p>
        </div>

        {/* Right: Stats */}
        <div className="url-card-stats">
          <div className="stat">
            <span className="stat-value">{url.clicks}</span>
            <span className="stat-label">clicks</span>
          </div>
          <div className="stat">
            <span className="stat-value">{daysLeft}d</span>
            <span className="stat-label">left</span>
          </div>
        </div>

      </div>

      {/* Actions */}
      <div className="url-card-actions">
        <button
          className={`btn btn-ghost btn-sm ${copied ? 'btn-copy is-copied' : 'btn-copy'}`}
          onClick={handleCopy}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
        <button
          className="btn btn-danger"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

export default UrlCard;
