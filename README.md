# Knowledge Hub

REST API for Knowledge Hub platform built with Nest.js.

## Prerequisites

- Git - [Download & Install Git](https://git-scm.com/downloads).
- Node.js 24.10.0+ - [Download & Install Node.js](https://nodejs.org/en/download/) and npm.
- Docker - [Download & Install Docker](https://docs.docker.com/engine/install/).

## Downloading

```
git clone {repository URL}
cd nodejs-2026q1-knowledge-hub
```

## Installing NPM modules

```
npm install
```

## Environment

Create local `.env` from `.env.example`:

```powershell
Copy-Item .env.example .env
```

Required default value for assignment:

- `PORT=4000`

## Running application

```
npm start
```

After starting the app, open Swagger UI at:

- `http://localhost:4000/doc`

Notes:

- `/doc` is the current runtime OpenAPI documentation generated from Nest decorators.
- `doc/api.yaml` is a static file and may not always match runtime behavior.

## Docker (Foundation for Prisma/PostgreSQL)

This repository includes Docker runtime infrastructure for the current in-memory API and for the upcoming Prisma migration step.

### Run with Docker Compose

```powershell
Copy-Item .env.example .env
docker-compose up --build
```

After startup:

- API: `http://localhost:4000/user`
- Swagger: `http://localhost:4000/doc`
- PostgreSQL: `localhost:5432`

Check service health:

```powershell
docker-compose ps
docker-compose logs app
docker-compose logs db
```

### Optional Adminer (debug profile)

```powershell
docker-compose --profile debug up --build
```

Adminer UI: `http://localhost:8080`

### Docker Hub image

Set your real image link after pushing:

- `https://hub.docker.com/r/<your-dockerhub-username>/knowledge-hub`

## Testing

Run tests in a separate terminal while app is running.

### Assignment-related tests

These suites validate functionality described in `assignment.md` (Users/Articles/Categories/Comments CRUD, validation, filters, cascades):

```bash
npm test
```

Run one specific suite:

```bash
npm run test -- <path to suite>
```

### Additional template test suites

These are template extensions for auth/RBAC/refresh scenarios:

```bash
npm run test:auth
```

```bash
npm run test:refresh
```

```bash
npm run test:rbac
```

Run one auth suite:

```bash
npm run test:auth -- <path to suite>
```

### Lint and format

```bash
npm run lint
```

```bash
npm run format
```

### Debugging in VSCode

Press <kbd>F5</kbd> to debug.

For more information, visit: https://code.visualstudio.com/docs/editor/debugging
