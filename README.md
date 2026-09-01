# WholesaleOS

Property-first CRM/automation platform architecture for high-volume US real estate
wholesaling operations. This repo currently contains architecture-stage scaffolding:
schema, workflow-engine, and valuation-engine reference code extracted from the
full technical spec.

## Layout

- docs/architecture.md — Full technical architecture spec (stack, schema, roadmap)
- prisma/schema.prisma — Property-first Postgres schema (Prisma syntax)
- src/workflow/workflow.ts — Temporal workflow definition (visual automation engine)
- src/workflow/activities.ts — Activity stubs invoked by the workflow (wire to services)
- src/valuation/mao-calculator.ts — ARV estimation + MAO ("70% rule") calculation

## Status

Architecture/scaffolding stage — activities.ts contains stubs that need to be wired to the
actual Telephony/CRM microservices described in docs/architecture.md before this runs.
