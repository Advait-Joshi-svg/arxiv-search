import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./App.css";

const API_BASE = "http://localhost:3001";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function buildCitation(paper) {
  if (!paper) return "";
  const authors = (paper.authors || []).join(", ");
  const year    = paper.publishedAt ? new Date(paper.publishedAt).getFullYear() : "";
  return `${authors}. (${year}). ${paper.title}. arXiv. ${paper.sourceUrl || ""}`;
}

export default function PaperDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [paper, setPaper]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState(null);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`${API_BASE}/api/papers/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(res.status === 404 ? "Paper not found" : `Error ${res.status}`);
        const data = await res.json();
        if (!cancelled) setPaper(data);
      } catch (e) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  function handleCopy() {
    navigator.clipboard.writeText(buildCitation(paper)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg">
      <div className="container">

        <header className="masthead">
          <div className="masthead-left" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            <div className="masthead-eyebrow">Research Index</div>
            <h1 className="title">arXiv<em>Search</em></h1>
          </div>
        </header>

        <div className="detail-nav">
          <button className="detail-back" onClick={() => navigate(-1)}>
            ← Back to results
          </button>
        </div>

        {loading && (
          <div className="loading-bar" style={{ marginTop: 24 }}>
            <div className="loading-bar-inner" />
          </div>
        )}

        {err && <div className="error-box" style={{ marginTop: 24 }}>Error: {err}</div>}

        {paper && (
          <article className="detail">

            <div className="detail-categories">
              {(paper.categories || []).map((c) => (
                <span key={c} className="chip">{c}</span>
              ))}
            </div>

            <h2 className="detail-title">{paper.title}</h2>

            <div className="detail-meta">
              <span className="detail-date">{formatDate(paper.publishedAt)}</span>
            </div>

            <div className="detail-authors">
              {(paper.authors || []).join(", ")}
            </div>

            <div className="detail-divider" />

            <section className="detail-abstract">
              <div className="detail-section-label">Abstract</div>
              <p className="detail-abstract-text">{paper.abstract}</p>
            </section>

            <div className="detail-divider" />

            <section className="detail-citation">
              <div className="detail-section-label">Citation</div>
              <p className="detail-citation-text">{buildCitation(paper)}</p>
              <button className="detail-copy-btn" onClick={handleCopy}>
                {copied ? "Copied ✓" : "Copy citation"}
              </button>
            </section>

            <div className="detail-actions">
              {paper.pdfUrl && (
                <a href={paper.pdfUrl} target="_blank" rel="noreferrer" className="detail-action-btn detail-action-btn--primary">
                  Download PDF ↗
                </a>
              )}
              {paper.sourceUrl && (
                <a href={paper.sourceUrl} target="_blank" rel="noreferrer" className="detail-action-btn">
                  View on arXiv ↗
                </a>
              )}
            </div>

          </article>
        )}

        <footer className="footer" style={{ marginTop: 48 }}>
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