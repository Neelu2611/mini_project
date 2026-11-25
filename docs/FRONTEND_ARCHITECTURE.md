# Frontend architecture

The local Next.js App Router workspace lives in `frontend/`. Its six routes share the same accessible navigation and status header. Navy navigation, white and light-gray surfaces, teal accents, Lucide icons, and a compact type hierarchy define the visual system. The layout uses a persistent sidebar on desktop and a collapsible navigation panel on smaller screens.

| Route | Phase 5 scope |
|---|---|
| `/` | Dashboard and live model metadata |
| `/assessment` | Patient assessment route foundation |
| `/results` | Empty prediction-results state |
| `/analytics` | Historical evaluation provenance |
| `/dataset` | Supplied dataset compatibility and provenance |
| `/about` | Intended use and limitations |

## Source layout

```text
frontend/
  src/app/                 App Router pages, global styles, loading and error UI
  src/components/layout/  Sidebar, header, mobile navigation and backend status
  src/components/ui/      Reusable panels and route layout
  src/hooks/               Cancellable requests for the header and model panel
  src/lib/                 API transport, response checks and generated API types
  tests/                   Playwright browser and API integration checks
```

## API boundary

`src/lib/api.generated.ts` is generated from the running FastAPI OpenAPI document. The small aliases in `api-contracts.ts` expose model, feature, fixture, patient and prediction contracts. `api.ts` handles transport, response validation, timeout, cancellation, and typed errors. It preserves the order of the backend probability entries and handles degraded readiness from the health endpoint's HTTP 503 response.

The browser calls FastAPI directly in this local phase. Set `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local` and restart Next.js after changing it. The default is `http://localhost:8000`. The backend allows browser requests from `http://localhost:3000` by default. The value is public and should contain no secrets. Browser-facing error messages avoid echoing input values. The client does not store encounters or prediction responses.

Regenerate the contract while FastAPI is running. From `frontend/`, run:

```powershell
npm.cmd run api:types
```

The assessment form, prediction visualizations and detailed analytics are future work. The prediction client is exercised using a verified synthetic fixture in tests. The UI displays model metadata and does not show fixture predictions as patient records.
