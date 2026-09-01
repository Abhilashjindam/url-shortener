/*
 * UrlHistory.jsx — The URL List Container
 *
 * CONCEPTS:
 *
 * 1. CONDITIONAL RENDERING:
 *    React can show different UI based on conditions.
 *    if (urls.length === 0) return <EmptyState />
 *    This is the "empty state" pattern — always handle the empty case.
 *
 * 2. LIST RENDERING (.map):
 *    To render a list of items, we use .map() to convert an array of data
 *    into an array of JSX elements.
 *    { urls.map(url => <UrlCard key={url._id} url={url} />) }
 *
 * 3. THE KEY PROP:
 *    When rendering lists, React needs a unique "key" prop on each element.
 *    This helps React efficiently update only the items that changed,
 *    rather than re-rendering the entire list.
 *    We use url._id (MongoDB's auto-generated unique ID) as the key.
 *    NEVER use array index as key — it breaks when items are deleted.
 *
 * 4. PROP DRILLING:
 *    App.jsx → UrlHistory → UrlCard
 *    onDelete is passed from App → UrlHistory → UrlCard.
 *    This is "prop drilling" — passing props through multiple layers.
 *    For small apps this is fine. For larger apps, you'd use Context or Redux.
 */

import UrlCard from './UrlCard';

function UrlHistory({ urls, onDelete }) {
  if (urls.length === 0) {
    return (
      <div className="card empty-state">
        <span className="empty-icon">🔗</span>
        <p className="empty-text">No links yet — shorten your first URL above!</p>
      </div>
    );
  }

  return (
    <section>
      <div className="history-header">
        <h2 className="history-title">Your Links</h2>
        <span className="count-pill">{urls.length}</span>
      </div>

      <div className="url-list">
        {urls.map((url) => (
          // key prop: unique identifier for React's reconciler
          // url is the data (props) passed to each UrlCard
          // onDelete is the callback UrlCard calls when user clicks Delete
          <UrlCard key={url._id} url={url} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}

export default UrlHistory;
