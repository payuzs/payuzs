# Payuzs SDK: Repository Architecture & Gateway Design

- **Status**: Draft (Awaiting Approval)
- **Author**: Antigravity
- **Date**: 2026-11-25
- **Scope**: Monorepo Organization, `@payuzs/core`, `@payuzs/click`, and `@payuzs/sdk`

---

## 1. Intent & Context

Uzbekistan has multiple distinct payment systems (Click, Payme, Uzum Bank / Apelsin, Octo, Paynet, etc.). Integrating them usually requires reading fragmented documentation and installing heavy or outdated third-party libraries laden with outdated dependencies (like `axios`, `crypto-js`, `body-parser`).

**Payuzs** is an open-source, zero-dependency, modern TypeScript SDK ecosystem for Uzbek payment gateways. It provides:

1. **Zero Runtime Dependencies**: Uses native web standards (`fetch`, `crypto.subtle`) and self-contained zero-dep algorithmic utilities (e.g. pure TypeScript MD5 hashing for Click).
2. **First-Class Tree-Shakability**: Devs can import from the umbrella package (`import { Click } from '@payuzs/sdk'`) or install individual micro-packages (`@payuzs/click`) with zero dead code retained in their production builds.
3. **Framework-Agnostic Webhooks**: Webhook processors accept standard `Request` / Node request payloads and return clean responses, working out-of-the-box with Express, Fastify, Hono, Next.js, Bun, and Node.js.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals

- Structure the repository as a scalable `pnpm` monorepo using **Vite+** (`vp`) for linting, formatting, typechecking, testing, and building.
- Build three initial packages:
  - `@payuzs/core`: Shared contracts, base errors, HTTP client abstraction, crypto helpers (pure zero-dep MD5, HMAC, SHA). Zero external dependencies (`dependencies: {}`).
  - `@payuzs/click`: Click Merchant API client (checkout URLs, transaction status, refunds/reversals) and Click Webhook handler (Prepare and Complete actions). Zero external 3rd-party dependencies (depends only on `@payuzs/core`).
  - `@payuzs/sdk`: Umbrella package re-exporting `@payuzs/click` and `@payuzs/core`, enabling `import { Click } from '@payuzs/sdk'`. Zero external 3rd-party dependencies.
- Zero external runtime dependencies: no 3rd-party npm packages (`dependencies: {}` in `@payuzs/core`; `@payuzs/click` and `@payuzs/sdk` depend only on internal `@payuzs/*` packages).
- Full ESM and CommonJS support with TypeScript declaration maps and `"sideEffects": false`.

### Non-Goals

- Frontend payment widgets, modals, or React components (this repository is dedicated to server-side and client-side API/webhook SDK logic).
- Database persistence layer (the SDK provides lifecycle hooks/callbacks, allowing developers to plug in Prisma, Drizzle, TypeORM, or custom DB queries without SDK coupling).

### Anti-Goals

- Adding runtime dependencies like `axios`, `crypto-js`, `lodash`, or framework-specific server packages (`express`, etc.) to published package dependencies.
- Monolithic bundle design that forces developers using only Click to bundle future Payme/Uzum code.

---

## 3. Approaches Considered

### Approach 1: Unified Single Package with Subpath Exports

- Single package `packages/sdk` published as `@payuzs/sdk` with subpaths (`@payuzs/sdk/click`).
- _Trade-off_: Simpler release process, but developers cannot install _only_ `@payuzs/click`.

### Approach 2: Multi-Package Monorepo with Split Gateways + Umbrella SDK (Selected)

- Micro-packages (`@payuzs/core`, `@payuzs/click`, future `@payuzs/payme`) + umbrella package (`@payuzs/sdk`).
- _Trade-off_: Slightly more package configuration, but provides maximum flexibility:
  - Users wanting all gateways or standard DX: `pnpm add @payuzs/sdk` -> `import { Click } from '@payuzs/sdk'`.
  - Users with ultra-minimal bundle budgets: `pnpm add @payuzs/click` -> `import { Click } from '@payuzs/click'`.
- _Decision_: **Selected by user.**

---

## 4. Repository & Monorepo Architecture

```text
payuzs/
├── packages/
│   ├── core/                      # @payuzs/core
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── crypto/            # Pure TS MD5, SHA256, HMAC, signature verifiers
│   │       ├── http/              # Native fetch wrapper with retry/timeout/typed response
│   │       ├── errors/            # Base PayuzsError, NetworkError, SignatureError
│   │       ├── types/             # Common payment gateway contracts & interfaces
│   │       └── index.ts
│   │
│   ├── click/                     # @payuzs/click
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── client.ts          # Merchant API (checkout URLs, transaction queries)
│   │       ├── webhook.ts         # Prepare & Complete request handlers & response helpers
│   │       ├── types.ts           # Click API schemas, error codes (-1 to -9), actions
│   │       ├── errors.ts          # ClickSpecific errors
│   │       └── index.ts
│   │
│   └── sdk/                       # @payuzs/sdk (umbrella)
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts           # export * from '@payuzs/click'; export * from '@payuzs/core';
│           ├── click.ts           # subpath export './click'
│           └── core.ts            # subpath export './core'
│
├── examples/
│   ├── express/                   # Click prepare/complete integration in Express
│   └── hono/                      # Click integration in Hono / Cloudflare Workers
│
├── pnpm-workspace.yaml            # pnpm workspace config (examples/*, packages/*)
├── package.json                   # Root workspace scripts (vp check, vp test, etc.)
└── vite.config.ts                 # Vite+ toolchain config
```

---

## 5. Technical Specifications

### 5.1 `@payuzs/core`

- **Crypto Subsystem**:
  - Click requires MD5 hashing of concatenated parameters: `md5(click_trans_id + service_id + secret_key + merchant_trans_id + amount + action + sign_time)`.
  - Standard `crypto.subtle` does not provide MD5. To ensure 100% zero-dependency execution across Node, Bun, Deno, and Edge environments, `@payuzs/core` implements an RFC 1321 compliant pure TypeScript MD5 hash function (~60 lines) with zero external imports.
  - SHA256 and HMAC utilities use standard Web Crypto API (`globalThis.crypto.subtle`).
- **HTTP Client**:
  - Thin wrapper over global `fetch` supporting timeout signals (`AbortSignal.timeout`), typed response JSON parsing, and normalized error throwing.
- **Errors**:
  - `PayuzsError`: Base error class extending `Error`.
  - `PayuzsSignatureError`: Thrown when gateway callback signature does not match.
  - `PayuzsApiError`: Thrown on gateway HTTP/API status failure.

### 5.2 `@payuzs/click`

- **Click Client**:
  - `ClickClient`:
    - `generatePaymentUrl(options: ClickPaymentUrlOptions): string` (supports web checkout redirect and Click app deep link).
    - `checkTransaction(params: ClickCheckTransactionParams): Promise<ClickTransactionStatus>`.
    - `refundTransaction(params: ClickRefundParams): Promise<ClickRefundResponse>` (Click `payment/reversal/` endpoint).
- **Click Webhook Handler**:
  - Supports Click's two-step protocol:
    1. **Action 0 (Prepare)**: Check if order exists, check amount, reserve order.
    2. **Action 1 (Complete)**: Confirm payment, mark order paid.
  - Exposes `ClickWebhookHandler` with callback hooks:
    ```typescript
    const handler = new ClickWebhookHandler({
      serviceId: "12345",
      merchantId: "67890",
      secretKey: "...",
      onPrepare: async (params) => {
        // Dev verifies order in DB
        return { success: true, merchantPrepareId: "prep_1" };
      },
      onComplete: async (params) => {
        // Dev marks order paid in DB
        return { success: true, merchantConfirmId: "conf_1" };
      },
    });
    ```
  - Standardized dispatcher: `handler.handleRequest(body: Record<string, any> | Request): Promise<ClickWebhookResponse>`. Returns Click's exact required JSON format (`{ error: 0, error_note: 'Success', ... }` or corresponding Click error codes `-1` to `-9`).

### 5.3 `@payuzs/sdk`

- Re-exports everything from `@payuzs/core` and `@payuzs/click`.
- Configured with `"sideEffects": false` in `package.json`.
- Export map supports:
  - `import { Click, ClickWebhookHandler } from '@payuzs/sdk'`
  - `import { Click } from '@payuzs/sdk/click'`

### 5.4 Build & Tooling Setup

- Package builds managed via Vite+ build tooling / `tsdown`.
- Root scripts orchestrate builds and tests across all workspace packages:
  - `vp check`: Oxlint + Oxfmt + typecheck.
  - `vp test`: Vitest test suites across all packages.
  - `vp build`: Produces clean dual ESM/CJS outputs + `.d.ts` declaration maps.

---

## 6. What's Left to the Builder

- Exact internal variable naming and parameter types for Click API schemas according to the official Click Merchant API v2 docs.
- Unit test coverage for MD5 crypto and Click signature validation with known Click test vectors.
- Setup of `package.json` package linking (`workspace:*`) in the pnpm workspace.
