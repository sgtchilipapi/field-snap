# Fylerr

The original `README.md` content has been split into focused docs under [`docs/`](docs/):

- [SPEC.md](docs/SPEC.md)
- [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [WORK_ORDERS.md](docs/WORK_ORDERS.md)

WhatsApp pivot docs:

- [WHATSAPP_MVP_SPEC.md](docs/WHATSAPP_MVP_SPEC.md)
- [WHATSAPP_GAP_ANALYSIS.md](docs/WHATSAPP_GAP_ANALYSIS.md)

Document split:

- `SPEC.md`: product definition, workflows, UX, acceptance criteria, future modules, risks
- `ARCHITECTURE.md`: database model, API spec, AI processing, Drive operations, security, technical architecture
- `WORK_ORDERS.md`: implementation work breakdown for the MVP
- `WHATSAPP_MVP_SPEC.md`: revised WhatsApp-first MVP spec for the pivot
- `WHATSAPP_GAP_ANALYSIS.md`: gap analysis between the current Drive/PWA MVP and the WhatsApp-first MVP

## Local Postgres

The current scaffold expects a live Postgres database for migrations and the `/api/health` check.

Start the local database:

```bash
docker compose up -d postgres
```

Run migrations:

```bash
npm run db:migrate
```

The default development connection string in [`.env.example`](.env.example) points at this container:

```text
postgres://postgres:postgres@localhost:5432/fylerr
```
