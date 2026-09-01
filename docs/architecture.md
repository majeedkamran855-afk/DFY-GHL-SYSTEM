# WholesaleOS — Enterprise Wholesaling SaaS Platform
## Technical Architecture Specification, Schema, Feature Matrix & Roadmap

**Version:** 1.0 · **Target:** High-volume US real estate wholesaling operations (multi-market, multi-tenant, millions of touches/day)

---

## Section 1: Recommended Tech Stack

### 1.1 Frontend

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router, RSC, Server Actions) | SSR for public disposition pages/funnels (SEO), streaming for dashboards |
| UI Kit | Tailwind CSS + shadcn/ui + Radix primitives | Fast, accessible, themeable per-tenant (white-label) |
| Workflow Canvas | React Flow (xyflow) + Dagre for auto-layout | Node-based automation builder, custom node types (SMS, Delay, Webhook, AI Agent, Condition) |
| State | TanStack Query + Zustand | Server-cache sync + local canvas/editor state |
| Realtime | WebSocket via Socket.IO or native WS through API Gateway, backed by Redis pub/sub | Live call whisper, dialer status, inbound SMS threads |
| Forms/Funnels | Custom drag-drop builder (Craft.js) rendered to static HTML/edge functions | Disposition marketplace pages, seller lead capture funnels |
| Mobile | React Native (Expo) for Cold Caller / Acquisitions field app | Driving-for-dollars GPS capture, offline-first lead entry |

### 1.2 Backend & Microservices

Polyglot by workload profile — not monolith-first, since telephony and CRM have wildly different scaling/latency needs.

| Service Domain | Language/Framework | Why |
|---|---|---|
| Core CRM / Deals / Contacts API | Node.js (NestJS) | Rich TS ecosystem, DI, matches frontend types via shared packages |
| Telephony Signaling & Media Control | Go (chi/fiber) + Twilio/Telnyx SDKs | Low-latency, high-concurrency socket handling for live calls |
| Workflow Execution Engine | Temporal (workers in Go or Node) | Durable execution, survives crashes mid-drip, native retries/timers |
| Skip Trace / Data Enrichment | Python (FastAPI) | ML/data-science ecosystem for record matching, dedup, fuzzy address resolution |
| Comps & Valuation (AVM) | Python (FastAPI) + NumPy/Pandas | Statistical modeling, easy integration with geo libraries (GeoPandas) |
| Billing/Metering | Node.js (NestJS) | Stripe SDK maturity, usage-based billing logic |
| Document/E-Sign Engine | Node.js + PDF-lib/pdf.js, signature capture in Go microservice for high-volume rendering | PDF field injection, hashed audit trail |
| API Gateway | Kong or AWS API Gateway | Centralized auth (JWT), rate-limiting per tenant, request routing |

Services communicate via gRPC internally (low overhead) and REST/GraphQL externally (BFF pattern — a GraphQL Federation gateway aggregates NestJS + Go services for the frontend).

### 1.3 Databases

| Store | Technology | Use |
|---|---|---|
| Primary OLTP | PostgreSQL 16 (Aurora or Citus for sharding) | Organizations, Users, Properties, Deals, Contracts — strong consistency required |
| Property History / Semi-structured | MongoDB or Postgres JSONB | Skip-trace raw payloads, distress-stack history snapshots, versioned enrichment data |
| Vector Store | pgvector (co-located with Postgres) or Pinecone at scale | Embedding-based comp similarity search, semantic buyer-buybox matching |
| Cache / Queue backing | Redis Cluster (ElastiCache) | Session cache, rate limiters, BullMQ queues, pub/sub for realtime |
| Search | Elasticsearch/OpenSearch | Full-text property/contact search, saved list filtering across millions of rows |
| Time-Series | TimescaleDB (Postgres extension) | Call/SMS event volumes, KPI dashboards, cost-per-lead trending |
| Data Warehouse | Snowflake or BigQuery (via CDC from Postgres using Debezium) | BI reporting, cross-tenant analytics, ML training sets |

**Sharding strategy:** tenant_id (organization_id) as the shard/partition key from day one on the largest tables (properties, contacts, activities, sms_messages, calls) using Postgres native partitioning or Citus distributed tables — avoids a costly re-architecture later.

### 1.4 Telephony & Messaging Infrastructure

- **Primary carrier layer:** Telnyx (cost efficiency, direct SIP) with Twilio as automatic failover — abstracted behind an internal `CommunicationsProvider` interface so carrier outages don't cause platform-wide downtime.
- **10DLC Compliance:** Native brand/campaign registration workflow (TCR — The Campaign Registry) built in-app; every sub-account maps to a registered brand + campaign; automatic throughput-tier enforcement to avoid carrier filtering.
- **Number provisioning:** Local-presence pool per market (area-code matched to property zip), automatic rotation to avoid spam-flagging, health scoring per number (delivery rate, opt-out rate, carrier filtering rate) with auto-retirement.
- **RVM (Ringless Voicemail):** Delivered via carrier drop or Telnyx/Twilio programmable voice with AMD (answering machine detection) bypass, queued through the same job pipeline as SMS for unified compliance logging.
- **Call recording/transcription:** Streamed to S3, transcribed via Deepgram or Whisper, indexed into Elasticsearch for searchable call library and AI-agent QA scoring.

### 1.5 Task/Job Queues

- **Temporal.io** — system of record for all long-running, stateful processes: multi-day drip campaigns, contract deadline monitors (EMD, inspection period, closing date), disposition offer windows.
- **BullMQ (Redis-backed)** — high-throughput, short-lived jobs: send this SMS now, enqueue this dial, fire this webhook, process this skip-trace batch row.
- **Kafka** — event backbone for cross-service domain events (`property.created`, `deal.stage_changed`, `sms.received`, `call.completed`) that multiple downstream consumers subscribe to independently.

### 1.6 Cloud & Infrastructure

- **AWS** primary (Aurora PostgreSQL, ElastiCache, MSK for Kafka, EKS for orchestration, S3 for media/documents, SES for transactional email).
- **Kubernetes (EKS)** with separate node pools for stateless API services vs. stateful/high-memory workers.
- **Cloudflare** in front of all public-facing surfaces: CDN, Workers for edge-rendering, WAF + rate limiting.
- **Terraform** for infra-as-code; **ArgoCD** for GitOps deployment to EKS.
- **Observability:** OpenTelemetry → Grafana/Tempo/Loki stack (or Datadog) with per-tenant tagging.

---

## Section 2: Unified Property-First Database Schema

Core design principle: `Property` is the anchor entity, not `Contact`. A property can have multiple owners over time, multiple deals attempted, multiple offers, and eventually one closed transaction with multiple buyers bidding.

See `prisma/schema.prisma` in this repo for the full schema definition.

**Key modeling decisions:**
- `PropertyOwner` is a junction table, not a direct FK on `Property`, because ownership changes over time and a wholesaler needs to see prior owner history (useful for probate/inheritance plays).
- `Offer` and `Contract` are separate: an `Offer` can be rejected/countered many times before a `Contract` exists.
- `BuyerAssignment` is the join between a `Contract` and a `Buyer`, capturing the assignment fee spread — the core wholesaling economic unit.
- Every high-volume table (`Activity`, `ContactPhone`, communications) is designed to be partitioned by `organizationId` at the physical layer.

---

## Section 3: Core Engine Architecture

### 3.1 Visual Workflow Engine

**Frontend (React Flow):** the canvas stores a JSON graph of nodes and edges. Node types: Trigger, Action (SMS/RVM/Call/Tag/Stage update/Task), Delay, Condition, AI Agent, Webhook. On publish, the JSON graph compiles server-side into a Temporal Workflow definition rather than being interpreted node-by-node at runtime.

**Backend execution (Temporal):** see `src/workflow/workflow.ts` and `src/workflow/activities.ts` for the reference implementation. A drip sequence with a multi-day delay must survive worker restarts, deploys, and node failures with zero lost/duplicated state — Temporal persists the workflow's execution history and replays deterministically.

### 3.2 Dialer & Telephony Engine

Key components:
- **AMD (Answering Machine Detection):** runs on each parallel-dialed leg; only the first human-answered leg bridges to the live agent.
- **Local presence rotation:** number selection picks from the org's phone pool matching the lead's area code,
