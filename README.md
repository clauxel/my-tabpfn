# TabPFN Studio

Conversion-focused SaaS site for **tabpfn.site**.

## What is included

- React/Vite frontend with a first-screen CSV fit scanner.
- Useful inner pages for TabPFN v2, the paper, Hugging Face, TabPFN-TS, Nature, R, architecture, and tabpfn-client.
- Cloudflare Worker with Workers Assets, `/api/runtime`, `/api/checkout`, `/sitemap.xml`, and `/robots.txt`.
- Creem hosted checkout with Pro annual selected by default and 50% annual savings.
- Cloudflare Workers and Pages GitHub Actions workflows.

## Local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

```bash
npm run cloudflare:deploy
```

Store the live Creem API key as a Worker or Pages secret named `API_PROD_KEY`.
