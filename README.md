# NovaSearch

NovaSearch is a production-minded search engine prototype with a React + TypeScript frontend and an Express backend proxy for genuine Brave Search results. The API key stays on the server.
NovaSearch is a production-minded search engine prototype with a React + TypeScript frontend and an Express backend proxy. It works immediately with a free DuckDuckGo HTML fallback and can optionally use Brave Search for richer structured results.

## Setup

1. Install Node.js 20 or newer.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env`.
4. Create a Brave Search API account at [brave.com/search/api](https://brave.com/search/api), create a subscription key, and set `BRAVE_SEARCH_API_KEY` in `.env`.
4. Start both applications: `npm run dev`
5. Open `http://localhost:5173`.

No API key is required. The server uses DuckDuckGo's public HTML search endpoint by default. For better reliability and official structured API access, optionally create a Brave Search account at [brave.com/search/api](https://brave.com/search/api) and set `BRAVE_SEARCH_API_KEY` in `.env`.
Never commit `.env`. The backend validates query length, applies CORS, keeps optional credentials server-side, and returns normalized result data to the client.

## Commands

- `npm run dev` starts Vite and the Express API together.
- `npm run build` creates the production frontend bundle and type-checks the app.
- `npm run lint` runs Oxlint.
- `npm run server` starts only the backend.

## Features

The app includes web, image, and news search through Brave, responsive results, pagination, autocomplete, recent searches stored locally, voice search where supported by the browser, keyboard focus with `Ctrl/Cmd + K`, copy-result actions, a theme toggle, and accessible loading, empty, and error states. Maps is presented as a product tab and currently uses the web provider because Brave's public Search API does not expose a dedicated maps endpoint.

Never commit `.env`. The backend validates query length, applies CORS, and returns normalized result data to the client.# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
