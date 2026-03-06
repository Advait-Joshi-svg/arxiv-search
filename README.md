# arXiv Search

A full-stack research paper search engine built on a local index of 7,000+ arXiv papers. Search by keyword with ranked results, filter by category, sort by relevance or date, and view full paper details.

**Live Demo:** https://arxiv-search-qdgpnn65w-advait-joshi-svgs-projects.vercel.app

## Features

- Full-text search across 7,000+ arXiv papers
- Relevance ranking using PostgreSQL `ts_rank_cd` with GIN-indexed `tsvector`
- Snippet generation with highlighted query terms via `ts_headline`
- Category filter bar — filter results by arXiv category with live counts
- Sort toggle — switch between relevance and date ordering
- Paper detail page — full abstract, authors, categories, and one-click citation copy
- Shareable URLs — query, page, and sort order synced to the URL

## Tech Stack

### Frontend
- **React** — UI framework
- **React Router** — client-side routing for paper detail pages
- **CSS** — custom styling with CSS variables, no component library

### Backend
- **Node.js + Express** — REST API server
- **TypeScript** — type-safe backend code

### Database
- **PostgreSQL** — primary data store
- **tsvector + GIN index** — full-text search index on title and abstract
- **websearch_to_tsquery** — natural language query parsing
- **ts_rank_cd** — relevance ranking
- **ts_headline** — search snippet generation with highlighted terms

### Data
- **arXiv API** — source for paper ingestion
