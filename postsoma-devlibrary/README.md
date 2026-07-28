# PostSoma DevLibrary

A curated bilingual (EN/ZH) archive of free programming books, courses, tutorials, and documentation. Search-first, dark mode, no noise.

This project transforms the massive `free-programming-books` Markdown repository into a structured, easily searchable, and localized web application.

## Architecture

- **Content Pipeline**: A Node.js script suite (`scripts/pipeline`) that reads the upstream Markdown files, parses them, filters for target languages (EN/ZH), deduplicates URLs, validates entries, and outputs static JSON.
- **GitHub Research Collection**: Manually saved repositories live in the independent `data/github-favorites.json` collection. A weekly GitHub API health check updates repository availability and maintenance signals without discovering or ingesting new projects.
- **Manual GitHub Curation**: `data/github-favorite-curation.json` keeps human-authored book/course relationships and the `devlibrary` vs. `agent-skills-hub` boundary outside the migration-owned repository records.
- **Frontend Explorer**: A Next.js 14 App Router application that consumes the static JSON to provide lightning-fast fuzzy search (via MiniSearch) and directory-first filtering.
- **Local Storage Library**: My Library stores saved resources locally in your browser using `localStorage`. No account is required. Clearing browser data will remove saved resources. Cloud sync is intentionally out of scope for v1.

## Local Development

```bash
# Install dependencies
npm install

# Run the content pipeline to generate public/data/*.json
npm run pipeline:generate

# One-time legacy CSV migration (do not run during normal builds)
npm run github:migrate

# Refresh archived/disabled/push health (requires GITHUB_TOKEN or GH_TOKEN)
npm run github:health

# Validate learning-resource links and Agent Skills Hub routing decisions
npm run github:validate-curation

# Run tests
npm run test

# Start the development server
npm run dev
```

`health` is derived in this order: disabled/unreachable → `unavailable`,
GitHub-archived → `archived`, no push within 180 days → `quiet`, otherwise
`active`. The quiet threshold can be changed with `GITHUB_QUIET_DAYS`.

GitHub curation validation runs automatically before static builds and content
pipeline generation, and after a legacy migration. Invalid resource references
fail validation. Items marked `belongsTo: "agent-skills-hub"` produce a
non-blocking recommendation to submit them to <https://205055.xyz> instead of
DevLibrary; no cross-product synchronization or automated ingestion is
performed.

## Static Deployment

This project uses Next.js Static Export (`output: "export"`) and is configured to be deployed as a static site to GitHub Pages.

### Deploying to GitHub Pages

A GitHub Actions workflow is provided (`.github/workflows/deploy-pages.yml`).
1. Push your code to the `main` branch.
2. In the GitHub repository settings, go to **Settings → Pages**.
3. Under **Build and deployment**, change the **Source** to **GitHub Actions**.

*Note: The `next.config.mjs` is currently configured to deploy to a repository project page (e.g. `https://USERNAME.github.io/postsoma-devlibrary/`). If you intend to deploy to a custom domain or a user root page, remove the `basePath` configuration in `next.config.mjs`.*

## Credit

Data source: [EbookFoundation/free-programming-books](https://github.com/EbookFoundation/free-programming-books)
Interface and curation layer: PostSoma DevLibrary
Signature: `postsoma-2050`
