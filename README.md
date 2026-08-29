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
npm run dev        # start local Vite dev server
npm run build      # build production assets
npm run preview    # preview production build
npm run lint       # auto-fix lint issues
npm run lint:check # lint without auto-fix
npm run format     # format source files
npm run check-css  # validate CSS assets
```

### Backend

```bash
cd backend
go test ./...
go run .
```

## Notes

- The project identity is intentionally standardized around the repository name: `scav`.
- The Go module path and frontend package metadata should stay aligned with the repository name to avoid confusion during onboarding and deployment.
