import { useState, useEffect } from "react";
import ShortenForm from "./components/ShortenForm";
import UrlHistory from "./components/UrlHistory";
import "./App.css";

function App() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllUrls();
  }, []);

  const fetchAllUrls = async () => {
    try {
      const res = await fetch("/api/urls");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setUrls(data);
    } catch (err) {
      console.error("Could not load URLs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewUrl = (newUrl) => {
    setUrls((prev) => {
      const exists = prev.some((u) => u._id === newUrl._id);
      if (exists) return prev;
      return [newUrl, ...prev];
    });
  };

  const handleDelete = (id) => {
    setUrls((prev) => prev.filter((url) => url._id !== id));
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-mark">⚡</span>
            <span className="logo-name">
              Snip<span>URL</span>
            </span>
          </div>
          <p className="tagline">Shorten links. Track clicks. Share smarter.</p>
        </div>
      </header>

      <main className="main">
        <ShortenForm onNewUrl={handleNewUrl} />
        {loading ? (
          <div className="loading">Fetching your links…</div>
        ) : (
          <UrlHistory urls={urls} onDelete={handleDelete} />
        )}
      </main>

      <footer className="footer">
        Built with MERN Stack ·{" "}
        <a href="https://github.com" target="_blank" rel="noreferrer">
          View on GitHub
        </a>
      </footer>
    </div>
  );
}

export default App;
