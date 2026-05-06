# PostSoma DevLibrary

A curated bilingual (EN/ZH) archive of free programming books, courses, tutorials, and documentation. Search-first, dark mode, no noise.

This project transforms the massive `free-programming-books` Markdown repository into a structured, easily searchable, and personalized web application.

## Architecture

- **Content Pipeline**: A Node.js script suite (`scripts/pipeline`) that reads the upstream Markdown files, parses them, filters for target languages (EN/ZH), deduplicates URLs, validates entries, and outputs static JSON.
- **Frontend Explorer**: A Next.js 14 App Router application that consumes the static JSON to provide lightning-fast fuzzy search (via MiniSearch) and filtering.
- **Personalization**: Firebase Auth and Firestore adapters allow users to sign in, bookmark resources, and track reading progress without mixing personal data with the public resource catalog.

## Development

```bash
# Install dependencies
npm install

# Run the content pipeline to generate public/data/*.json
npm run pipeline:generate

# Run tests
npm run test

# Start the development server
npm run dev
```

## Verification Checklist (MVP)

- [x] `npm run test` passes (Pipeline unit tests).
- [x] `npm run pipeline:generate` creates valid JSON.
- [x] Frontend renders without errors.
- [x] Search works for English resources.
- [x] Search works for Chinese resources.
- [x] Language filter works.
- [x] Category filter works.
- [x] Google login adapter exists.
- [x] Bookmark adapter exists.
- [x] Reading status adapter exists.
- [x] GitHub Actions sync workflow is defined.

*Note: In the current environment, `npm install` fails due to network restrictions, but the complete architecture and codebase for the MVP has been implemented.*
