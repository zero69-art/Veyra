# Veyra

Veyra is a Business Intelligence OS: a decision-support layer that turns business data into intelligence, monitoring, forecasts, reports, alerts and workflows.

## Current release
Veyra 0.2 is a deployable foundation with a React/Vite intelligence workspace, API health checks, a deterministic baseline intelligence endpoint, provenance metadata, PostgreSQL schema, and Vercel configuration.

## Run
`npm install`
`npm run dev`

## Build
`npm run build`

## API
- GET /api/health
- POST /api/intelligence

Example body: `{"metric":"revenue","horizonDays":30,"values":[100,102,104,106,109]}`

The baseline is explicitly decision support and not a financial-advice or guaranteed-prediction system.
