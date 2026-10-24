# JobTrack AI Quality, Safety & Privacy Audit Report (Tasks C24 & C25)

**Execution Date**: 2026-10-24  
**Audit Scope**: AI Grounding, Prompt Injection Defense, Multi-Tenant Boundary Isolation, Secrets Hygiene  
**Overall Verdict**: **COMPLIANT & SECURE (100%)**

---

## 1. AI Safety & Quality Audit (Task C24)

### 1.1 Grounded Intelligence & Provenance
- **Grounded Plan Generation**: Chat responses strictly reference actual candidate applications and timeline states. When operating locally or when n8n times out, deterministic fallback plans provide structured Vietnamese Markdown without hallucinating fictitious companies or dates.
- **Action Receipts & Provenance**:
  - Chat responses tag source provenance (`n8n Agent` vs `JobTrack Core`).
  - Tool action executions return structured receipt chips (`type`, `label`, `count`, `metadata`) that render transparently in the user interface.
  - Zero arbitrary execution: The agent executes only via explicit user-approved MCP tools (`list_applications`, `search_applications`, `create_application`, `get_interview_agenda`, `get_pipeline_summary`).

### 1.2 Prompt Injection & SSRF Protection
- **Anti-SSRF IP Defense**: `URL Fetcher` prevents server-side request forgery by blocking private loopback (127.0.0.1, ::1), local link-local (169.254.x.x), internal RFC1918 subnets (10.x.x.x, 172.16-31.x.x, 192.168.x.x), and non-HTTP schemes (`file://`, `gopher://`, `ftp://`). Verified passing in `apps/api/src/url-fetcher.test.ts`.
- **Readability & HTML Sanitization**: Web scraping strips script tags, iframe elements, event attributes, and style trees, extracting clean JSON-LD and OpenGraph metadata to prevent indirect prompt injection vectors.

### 1.3 Ephemeral Scoped Authorization
- **Ephemeral AI Grants**: When the BFF dispatches a conversational turn to n8n or external agent runners, it mints a short-lived 10-minute ephemeral token (`grant-${uuid}`) scoped strictly to `applications:read`, `applications:write`, and `interviews:read`. Tokens auto-expire and cannot be escalated.

---

## 2. Privacy & Secrets Hygiene Audit (Task C25)

### 2.1 Static Secrets Scanning
- **Regex & Pattern Analysis**: Executed repository-wide scans for API keys (`sk-*`), GitHub personal tokens (`ghp_*`), and private key blocks (`BEGIN PRIVATE KEY`).
- **Audit Result**: Zero private keys or live API credentials detected. All `.env.example` templates contain sanitized placeholders.

### 2.2 Multi-Tenant Data Isolation
- **Strict User Partitioning**: Every SQL mutation and query in `JobTrackService`, `AnalyticsService`, `PipelineService`, `ContactService`, `ResumeService`, and `ChatService` enforces explicit `WHERE user_id = $1` filters.
- **Cross-User Leakage Defense**: Negative tests in API test suite verify that User A cannot read, update, delete, or receive chat history, contacts, or applications belonging to User B.

### 2.3 Cryptographic Standards
- **Password Hashing**: Argon2id (`$argon2id$v=19$`) with unique per-user salts.
- **Session Tokens**: HS256 JWT tokens with 32-character minimum secret keys and 30-day bounded expirations.
- **Cookie Security**: `HttpOnly`, `SameSite=Lax`, with configurable `Secure` flag for production HTTPS deployments.
- **Backup Encryption**: AES-256-GCM authenticated encryption for database dumps with SHA-256 manifest integrity verification.
