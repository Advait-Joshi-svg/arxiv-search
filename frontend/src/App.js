import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const API_BASE = "http://localhost:3001";

const SUGGESTIONS = [
  "transformer attention", "diffusion models", "reinforcement learning",
  "graph neural networks", "contrastive learning", "large language models",
  "variational autoencoder", "federated learning",
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function readUrlState() {
  const p = new URLSearchParams(window.location.search);
  return {
    q:    p.get("q")    || "",
    page: Math.max(1, Number(p.get("page") || 1)),
    sort: p.get("sort") === "date" ? "date" : "relevance",
    mode: p.get("mode") === "semantic" ? "semantic" : "keyword",
  };
}

function pushUrlState(q, page, sort, mode) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (page > 1) p.set("page", String(page));
  if (sort !== "relevance") p.set("sort", sort);
  if (mode !== "keyword") p.set("mode", mode);
  const qs = p.toString();
  window.history.pushState({}, "", qs ? `?${qs}` : window.location.pathname);
}

export default function App() {
  const init     = readUrlState();
  const navigate = useNavigate();

  const [query, setQuery]                   = useState(init.q);
  const [committedQuery, setCommitted]      = useState(init.q);
  const [page, setPage]                     = useState(init.page);
  const [pageSize]                          = useState(10);
  const [data, setData]                     = useState(null);
  const [loading, setLoading]               = useState(false);
  const [err, setErr]                       = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [sort, setSort]                     = useState(init.sort);
  const [mode, setMode]                     = useState(init.mode);
  const searchRef                           = useRef(null);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const categoryCounts = useMemo(() => {
    if (!data?.results?.length) return [];
    const counts = {};
    data.results.forEach((r) => {
      (r.categories || []).forEach((c) => {
        counts[c] = (counts[c] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [data]);

  const filteredResults = useMemo(() => {
    if (!data?.results) return [];
    if (!activeCategory) return data.results;
    return data.results.filter((r) => (r.categories || []).includes(activeCategory));
  }, [data, activeCategory]);

  async function runSearch(q, p, s, m) {
    const base = m === "semantic" ? `${API_BASE}/api/search/semantic` : `${API_BASE}/api/search`;
    const url  = new URL(base);
    url.searchParams.set("q", q);
    url.searchParams.set("page", String(p));
    url.searchParams.set("pageSize", String(pageSize));
    if (m === "keyword") url.searchParams.set("sort", s);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Search failed (${res.status})`);
    return res.json();
  }

  useEffect(() => {
    if (!committedQuery.trim()) { setData(null); setErr(null); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const resp = await runSearch(committedQuery, page, sort, mode);
        if (!cancelled) { setData(resp); setActiveCategory(null); }
      } catch (e) {
        if (!cancelled) setErr(e.message || "Search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [committedQuery, page, pageSize, sort, mode]);

  useEffect(() => {
    if (committedQuery.trim()) {
      pushUrlState(committedQuery, page, sort, mode);
    }
  }, [committedQuery, page, sort, mode]);

  const handlePopState = useCallback(() => {
    const s = readUrlState();
    setQuery(s.q);
    setCommitted(s.q);
    setPage(s.page);
    setSort(s.sort);
    setMode(s.mode);
    setActiveCategory(null);
    if (!s.q) setData(null);
  }, []);

  useEffect(() => {
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [handlePopState]);

  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable;
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function onSubmit(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setCommitted(q);
    setPage(1);
  }

  function pickSuggestion(s) {
    setQuery(s);
    setCommitted(s);
    setPage(1);
  }

  function toggleCategory(cat) {
    setActiveCategory((prev) => (prev === cat ? null : cat));
  }

  function handleSortChange(newSort) {
    if (newSort === sort) return;
    setSort(newSort);
    setPage(1);
    setActiveCategory(null);
  }

  function handleModeChange(newMode) {
    if (newMode === mode) return;
    setMode(newMode);
    setPage(1);
    setActiveCategory(null);
    setSort("relevance");
  }

  function goHome() {
    setQuery("");
    setCommitted("");
    setPage(1);
    setData(null);
    setErr(null);
    setActiveCategory(null);
    setSort("relevance");
    setMode("keyword");
    window.history.pushState({}, "", window.location.pathname);
  }

  const showHero     = !committedQuery;
  const showResults  = filteredResults.length > 0;
  const displayTotal = activeCategory ? filteredResults.length : data?.total;

  return (
    <div className="bg">
      <div className="container">

        <header className="masthead">
          <div className="masthead-left" onClick={goHome} style={{ cursor: "pointer" }}>
            <div className="masthead-eyebrow">Research Index</div>
            <h1 className="title">arXiv<em>Search</em></h1>
          </div>
          <div className="masthead-meta">
            <div className="meta-cell">
              <span className="meta-label">Papers</span>
              <span className="meta-value">7,000+</span>
            </div>
            <div className="meta-cell">
              <span className="meta-label">Backend</span>
              <span className="meta-value">Express</span>
            </div>
            <div className="meta-cell">
              <span className="meta-label">Database</span>
              <span className="meta-value">Postgres</span>
            </div>
          </div>
        </header>

        <section className="search-section">
          <div className="mode-toggle">
            <button
              className={`mode-btn${mode === "keyword" ? " mode-btn--active" : ""}`}
              onClick={() => handleModeChange("keyword")}
            >
              Keyword
            </button>
            <button
              className={`mode-btn${mode === "semantic" ? " mode-btn--active" : ""}`}
              onClick={() => handleModeChange("semantic")}
            >
              Semantic
            </button>
          </div>
          <form onSubmit={onSubmit} className="search-row">
            <input
              ref={searchRef}
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 7,000+ research papers…"
              autoFocus
            />
            {!query && <kbd className="search-kbd">/</kbd>}
            <button className="search-btn" type="submit" disabled={!query.trim() || loading}>
              {loading ? "Searching" : "Search →"}
            </button>
          </form>
        </section>

        <div className="status-bar">
          {committedQuery ? (
            <>
              <div className="status-left">
                {data && (
                  <>
                    <span className="status-count">
                      <strong>{displayTotal?.toLocaleString()}</strong> results
                      {activeCategory && <span className="status-filtered"> in <strong>{activeCategory}</strong></span>}
                    </span>
                    <span className="status-latency">{data.latencyMs}ms</span>
                  </>
                )}
                {loading && !data && <span>Searching…</span>}
              </div>
              <div className="status-right">
                {data && mode === "keyword" && (
                  <div className="sort-toggle">
                    <button
                      className={`sort-btn${sort === "relevance" ? " sort-btn--active" : ""}`}
                      onClick={() => handleSortChange("relevance")}
                    >
                      Relevance
                    </button>
                    <button
                      className={`sort-btn${sort === "date" ? " sort-btn--active" : ""}`}
                      onClick={() => handleSortChange("date")}
                    >
                      Date
                    </button>
                  </div>
                )}
                {data && mode === "semantic" && (
                  <span className="semantic-badge">cosine similarity</span>
                )}
              </div>
            </>
          ) : (
            <span>PostgreSQL full-text search · tsvector · ts_rank_cd</span>
          )}
        </div>

        {loading && (
          <div className="loading-bar">
            <div className="loading-bar-inner" />
          </div>
        )}

        {err && <div className="error-box">Error: {err}</div>}

        {categoryCounts.length > 0 && (
          <div className="filter-bar">
            <span className="filter-label">Filter</span>
            <div className="filter-chips">
              {categoryCounts.map(([cat, count]) => (
                <button
                  key={cat}
                  className={`filter-chip${activeCategory === cat ? " filter-chip--active" : ""}`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                  <span className="filter-chip-count">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showHero && (
          <div className="hero">
            <h2 className="hero-headline">
              Find the research<br />you're <em>looking for.</em>
            </h2>
            <p className="hero-body">
              Full-text search across 7,000+ arXiv papers, ranked by relevance using
              PostgreSQL's <code>ts_rank_cd</code> with GIN-indexed tsvectors.
            </p>
            <div className="hero-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="hero-tag" onClick={() => pickSuggestion(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <main className="results">
          {showResults && filteredResults.map((r) => (
            <article key={r.id} className="card">
              <div className="card-date">{formatDate(r.publishedAt)}</div>

              <h2 className="card-title">
                <a
                  href={`/paper/${r.id}`}
                  onClick={(e) => { e.preventDefault(); navigate(`/paper/${r.id}`); }}
                >
                  {r.title}
                </a>
              </h2>

              <div className="card-authors">
                {(r.authors || []).slice(0, 6).join(", ")}
                {(r.authors || []).length > 6 ? " et al." : ""}
              </div>

              <div className="card-chips">
                {(r.categories || []).slice(0, 5).map((c) => (
                  <button
                    key={c}
                    className={`chip${activeCategory === c ? " chip--active" : ""}`}
                    onClick={() => toggleCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div
                className="card-snippet"
                dangerouslySetInnerHTML={{ __html: r.snippet }}
              />

              <div className="card-footer">
                {r.pdfUrl && (
                  <a href={r.pdfUrl} target="_blank" rel="noreferrer" className="card-link">
                    PDF ↗
                  </a>
                )}
                <span className="card-divider">·</span>
                <span className="card-rank">rank {Number(r.rank).toFixed(4)}</span>
              </div>
            </article>
          ))}

          {data && filteredResults.length === 0 && !loading && (
            <div className="empty">
              {activeCategory
                ? `No results in "${activeCategory}" — try a different filter.`
                : `No results for "${committedQuery}" — try different terms.`}
            </div>
          )}
        </main>

        {data && data.total > data.pageSize && !activeCategory && (
          <div className="pager">
            <button
              className="pager-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => clamp(p - 1, 1, totalPages))}
            >
              ← Prev
            </button>
            <div className="pager-text">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </div>
            <button
              className="pager-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => clamp(p + 1, 1, totalPages))}
            >
              Next →
            </button>
          </div>
        )}

        <footer className="footer">
          <span>© {new Date().getFullYear()} arXiv Search</span>
          <div className="footer-stack">
            <span className="footer-tag">React</span>
            <span className="footer-tag">Express</span>
            <span className="footer-tag">PostgreSQL</span>
            <span className="footer-tag">tsvector</span>
          </div>
        </footer>

      </div>
    </div>
  );
}