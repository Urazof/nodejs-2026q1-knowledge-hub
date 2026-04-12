# Knowledge Hub

REST API for Knowledge Hub platform built with Nest.js.

## Prerequisites

- Git - [Download & Install Git](https://git-scm.com/downloads).
- Node.js 24.10.0+ - [Download & Install Node.js](https://nodejs.org/en/download/) and npm.

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
