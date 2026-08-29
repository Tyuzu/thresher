# scav

Scav is a scalable monolith project with a Go backend and a Vite-based frontend. The repository is organized as a single workspace with separate app boundaries for the API, UI, and operational utilities.

## Structure

- `backend/` — Go API server and domain modules
- `front/` — Vite + TypeScript frontend app
- `utilities/` — helper scripts for maintenance, code quality, and build automation
- `go.work` — Go workspace definition for the backend module

## Quick start

### Frontend

```bash
cd front
npm install
npm run dev
```

### Backend

```bash
cd backend
go mod download
go run .
```

## Useful scripts

### Frontend

```bash
cd front
npm run dev           # start local Vite dev server
npm run dev:host      # start Vite on localhost with host access
npm run build         # build production assets
npm run preview       # preview production build
npm run lint          # auto-fix lint issues
npm run lint:check    # lint without auto-fix
npm run format        # format source files
npm run check:css     # validate CSS assets
npm run check:project # verify frontend project structure
npm run check:backend # ping the backend readiness endpoint
npm run verify        # run project + backend health checks
```

### Backend

```bash
cd backend
go test ./...
go run .
```

## Architecture boundary

This project is organized as a monolith with clearly separated layers:

- `backend/` — HTTP server, routers, application core, infrastructure, and domain logic
- `front/` — Vite frontend for the user interface and client-side state
- `utilities/` — maintenance and project-level automation scripts
- `go.work` — workspace configuration for the Go backend module

The main boundary is simple: the frontend talks to the backend over HTTP/WebSocket endpoints, while the backend owns all persistence, auth, workers, and business logic.

## Health and verification

Use the project checks before opening a PR or testing a fresh environment:

```bash
cd front
npm run check:project
npm run check:backend
```

The backend health check targets the readiness endpoint exposed by the API and will fail fast if the service is down or unreachable.

## Notes

- The project identity is intentionally standardized around the repository name: `scav`.
- The Go module path and frontend package metadata should stay aligned with the repository name to avoid confusion during onboarding and deployment.
