# Payuzs SDK Repository Organization & Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a modern, zero-dependency, tree-shakeable pnpm monorepo for Uzbekistan payment gateways with `@payuzs/core`, `@payuzs/click`, and `@payuzs/sdk` umbrella packages built with Vite+.

**Architecture:** Monorepo with three core packages (`packages/core`, `packages/click`, `packages/sdk`) and runnable example apps (`apps/example-express`, `apps/example-hono`). Crypto algorithms (MD5, HMAC, SHA) and HTTP clients use zero external runtime dependencies. Dual ESM/CJS outputs with `"sideEffects": false` ensure complete tree-shakability.

**Tech Stack:** TypeScript, Vite+ (`vp`), pnpm workspaces, Vitest, Oxlint, Oxfmt.

**Spec:** [docs/superpowers/specs/2026-11-25-payuzs-sdk-repo-organization-design.md](file:///home/nozim/Work/payuzs/docs/superpowers/specs/2026-11-25-payuzs-sdk-repo-organization-design.md)

---

## Global Constraints

- **Dependency floor**: Zero 3rd-party runtime dependencies in published packages (`dependencies: {}` in `@payuzs/core`; `@payuzs/click` and `@payuzs/sdk` depend strictly on internal `@payuzs/*` packages).
- **Toolchain**: Vite+ (`vp dev`, `vp check`, `vp test`, `vp build`).
- **Runtime Target**: Node 18+, Bun, Deno, and Edge environments (Cloudflare Workers).
- **Package Manifest**: Every published package MUST include `"sideEffects": false` and properly configured `exports` map for `import` (ESM) and `require` (CJS).
- **Naming**: Scoped npm packages under `@payuzs/*`.

---

## Review Focus

1. **Click MD5 signature mismatch due to parameter ordering or float formatting**: Click sign string is `md5(click_trans_id + service_id + secret_key + merchant_trans_id + (action == 1 ? merchant_prepare_id : '') + amount + action + sign_time)`. If amount has float rounding (e.g. `1000.00` vs `1000`), the signature fails. The SDK must consistently format numeric amounts.
2. **Action 0 (Prepare) vs Action 1 (Complete) parameter difference**: In Action 1, `merchant_prepare_id` is required in the MD5 signature hash; in Action 0, it is omitted. The verifier must conditionally include it based on `action`.
3. **Framework-agnostic webhook request handling**: Devs in Express use parsed body objects (`req.body`), while modern frameworks (Hono, Next.js, Fetch) use standard Web `Request` objects or raw JSON strings. The webhook handler must accept either an object, a string, or a Web `Request`.
4. **Duplicate error response format in Click webhook**: Click expects `{ error: number, error_note: string }` with HTTP 200 OK even on error conditions (such as invalid signature: error `-1`). Throwing standard 4xx/5xx HTTP errors will cause Click to repeatedly retry. Webhook handler must return HTTP 200 JSON with Click error codes.
5. **Zero-dependency MD5 edge compatibility**: Web Crypto API (`crypto.subtle`) lacks MD5. The pure TS MD5 implementation in `@payuzs/core` must match standard RFC 1321 test vectors without using `node:crypto`.

---

## File Structure

```text
payuzs/
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── crypto/
│   │   │   │   ├── md5.ts
│   │   │   │   ├── hmac.ts
│   │   │   │   └── index.ts
│   │   │   ├── http/
│   │   │   │   ├── client.ts
│   │   │   │   └── index.ts
│   │   │   ├── errors/
│   │   │   │   ├── base.ts
│   │   │   │   ├── api.ts
│   │   │   │   ├── signature.ts
│   │   │   │   └── index.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   └── tests/
│   │       ├── md5.test.ts
│   │       ├── hmac.test.ts
│   │       └── http.test.ts
│   │
│   ├── click/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── errors.ts
│   │   │   ├── client.ts
│   │   │   ├── webhook.ts
│   │   │   └── index.ts
│   │   └── tests/
│   │       ├── client.test.ts
│   │       └── webhook.test.ts
│   │
│   └── sdk/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── click.ts
│       │   └── core.ts
│       └── tests/
│           └── exports.test.ts
│
├── apps/
│   ├── example-express/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   └── example-hono/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/index.ts
│
├── pnpm-workspace.yaml
├── package.json
└── vite.config.ts
```

---

## Tasks

### Task 1: Monorepo Scaffolding & Workspace Configuration

**Files:**

- Modify: `pnpm-workspace.yaml`
- Modify: `package.json`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/click/package.json`
- Create: `packages/click/tsconfig.json`
- Create: `packages/sdk/package.json`
- Create: `packages/sdk/tsconfig.json`
- Modify: `vite.config.ts`

**Interfaces:**

- Produces: Monorepo package manifests linked via `workspace:*` with scripts `vp check`, `vp test`, `vp build`.

- [ ] **Step 1: Create package.json manifests and tsconfig.json for core, click, and sdk**
  - Set `name`: `@payuzs/core`, `@payuzs/click`, `@payuzs/sdk`.
  - Set `"type": "module"`, `"sideEffects": false`.
  - Configure exports maps for `import` (`./dist/index.js`) and `types` (`./dist/index.d.ts`).
  - Set `"dependencies": {}` for `@payuzs/core`.
  - In `@payuzs/click`, set `"dependencies": { "@payuzs/core": "workspace:*" }`.
  - In `@payuzs/sdk`, set `"dependencies": { "@payuzs/core": "workspace:*", "@payuzs/click": "workspace:*" }`.

- [ ] **Step 2: Run pnpm install via Vite+**
      Run: `vp install`
      Expected: Dependencies resolved, workspace links created.

- [ ] **Step 3: Verify workspace setup with vp check**
      Run: `vp check`
      Expected: Success or clean status.

- [ ] **Step 4: Commit**
  ```bash
  git add packages pnpm-workspace.yaml package.json vite.config.ts
  git commit -m "chore: scaffold monorepo packages for core, click, and sdk"
  ```

---

### Task 2: `@payuzs/core` - Pure Crypto Subsystem (Zero-dep MD5 & HMAC)

**Files:**

- Create: `packages/core/src/crypto/md5.ts`
- Create: `packages/core/src/crypto/hmac.ts`
- Create: `packages/core/src/crypto/index.ts`
- Create: `packages/core/tests/md5.test.ts`
- Create: `packages/core/tests/hmac.test.ts`

**Interfaces:**

- Produces:
  - `md5(data: string | Uint8Array): string`: Pure RFC 1321 TS implementation returning 32-char lowercase hex string.
  - `hmacSha256(key: string, message: string): Promise<string>`: Web Crypto API based HMAC-SHA256 hex string.
  - `sha256(data: string): Promise<string>`: Web Crypto API based SHA256 hex string.

- [ ] **Step 1: Write failing tests for MD5 with RFC 1321 test vectors**
      In `packages/core/tests/md5.test.ts`:

  ```typescript
  import { describe, it, expect } from "vitest";
  import { md5 } from "../src/crypto/md5";

  describe("md5", () => {
    it("hashes empty string correctly", () => {
      expect(md5("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
    });
    it('hashes "a" correctly', () => {
      expect(md5("a")).toBe("0cc175b9c0f1b6a831c399e269772661");
    });
    it('hashes "message digest" correctly', () => {
      expect(md5("message digest")).toBe("f96b697d7cb7938d525a2f31aaf161d0");
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
      Run: `vp test packages/core/tests/md5.test.ts`
      Expected: FAIL (module or function not found).

- [ ] **Step 3: Implement `md5(data: string | Uint8Array): string` in `packages/core/src/crypto/md5.ts`**
      Implement standard RFC 1321 pure TS algorithm with no external imports.

- [ ] **Step 4: Implement HMAC & SHA256 in `packages/core/src/crypto/hmac.ts` and add tests**
      Write tests in `packages/core/tests/hmac.test.ts` and implement using `globalThis.crypto.subtle`.

- [ ] **Step 5: Run tests and verify they pass**
      Run: `vp test packages/core/tests`
      Expected: All crypto tests PASS.

- [ ] **Step 6: Commit**
  ```bash
  git add packages/core
  git commit -m "feat(core): implement zero-dependency md5, sha256 and hmac crypto utils"
  ```

---

### Task 3: `@payuzs/core` - Errors & Standard HTTP Client

**Files:**

- Create: `packages/core/src/errors/base.ts`
- Create: `packages/core/src/errors/api.ts`
- Create: `packages/core/src/errors/signature.ts`
- Create: `packages/core/src/errors/index.ts`
- Create: `packages/core/src/http/client.ts`
- Create: `packages/core/src/http/index.ts`
- Create: `packages/core/src/types/index.ts`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/tests/http.test.ts`

**Interfaces:**

- Produces:
  - `class PayuzsError extends Error`
  - `class PayuzsApiError extends PayuzsError { status: number; body?: unknown }`
  - `class PayuzsSignatureError extends PayuzsError`
  - `class PayuzsHttpClient { constructor(options?: HttpClientOptions); request<T>(url: string, options?: RequestOptions): Promise<T>; }`
  - `interface BasePaymentGateway`

- [ ] **Step 1: Write failing tests for HTTP Client**
      In `packages/core/tests/http.test.ts`:
  - Test GET and POST requests with mocked `globalThis.fetch`.
  - Test request timeout triggering `PayuzsApiError`.
  - Test JSON response parsing and HTTP error status handling.

- [ ] **Step 2: Run test to verify it fails**
      Run: `vp test packages/core/tests/http.test.ts`
      Expected: FAIL.

- [ ] **Step 3: Implement Error classes and `PayuzsHttpClient`**
  - Implement `PayuzsError`, `PayuzsApiError`, `PayuzsSignatureError`.
  - Implement `PayuzsHttpClient` using `globalThis.fetch` and `AbortSignal.timeout(timeoutMs)`.
  - Export all public APIs from `packages/core/src/index.ts`.

- [ ] **Step 4: Run tests to verify they pass**
      Run: `vp test packages/core/tests`
      Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add packages/core
  git commit -m "feat(core): implement errors, http client, and gateway interfaces"
  ```

---

### Task 4: `@payuzs/click` - Types & Client (Merchant API & Checkout URLs)

**Files:**

- Create: `packages/click/src/types.ts`
- Create: `packages/click/src/errors.ts`
- Create: `packages/click/src/client.ts`
- Create: `packages/click/src/index.ts`
- Create: `packages/click/tests/client.test.ts`

**Interfaces:**

- Consumes: `@payuzs/core` (`md5`, `PayuzsHttpClient`, `PayuzsError`, `PayuzsApiError`)
- Produces:
  - `ClickErrorCode` enum: Success (0), SignFailed (-1), InvalidAmount (-2), ActionNotFound (-3), AlreadyPaid (-4), UserNotFound (-5), TransactionNotFound (-6), ErrorUpdate (-7), ErrorRequest (-8), TransactionCanceled (-9).
  - `ClickClientConfig`: `{ serviceId: string; merchantId: string; secretKey: string; merchantUserId?: string; baseUrl?: string; }`
  - `class ClickClient`:
    - `generatePaymentUrl(options: ClickPaymentUrlOptions): string` (Click web checkout URL and `clickuz://` deep link support).
    - `checkTransaction(params: ClickCheckTransactionParams): Promise<ClickCheckTransactionResponse>`
    - `refundTransaction(params: ClickRefundParams): Promise<ClickRefundResponse>`

- [ ] **Step 1: Write failing tests for ClickClient**
      In `packages/click/tests/client.test.ts`:
  - Test `generatePaymentUrl`: verifies correct query params (`service_id`, `merchant_id`, `amount`, `transaction_param`, `return_url`).
  - Test Click Merchant API request header signing: Click requires `Auth: merchant_user_id:sha1(timestamp + secret_key):timestamp`.
  - Test `checkTransaction` and `refundTransaction` with mocked fetch.

- [ ] **Step 2: Run test to verify it fails**
      Run: `vp test packages/click/tests/client.test.ts`
      Expected: FAIL.

- [ ] **Step 3: Implement Click types, errors, and ClickClient**
  - Define `ClickErrorCode` and friendly error messages in `errors.ts`.
  - In `client.ts`, implement URL builder and Merchant API endpoints with SHA1/MD5 auth.

- [ ] **Step 4: Run tests to verify they pass**
      Run: `vp test packages/click/tests/client.test.ts`
      Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add packages/click
  git commit -m "feat(click): implement Click types, errors, and ClickClient"
  ```

---

### Task 5: `@payuzs/click` - Webhook Handler (Prepare & Complete)

**Files:**

- Create: `packages/click/src/webhook.ts`
- Modify: `packages/click/src/index.ts`
- Create: `packages/click/tests/webhook.test.ts`

**Interfaces:**

- Consumes: `@payuzs/core` (`md5`), `@payuzs/click` (`ClickErrorCode`, types)
- Produces:
  - `class ClickWebhookHandler`:
    - `constructor(config: ClickWebhookConfig)`
    - `handleRequest(payload: ClickWebhookPayload | Request | string): Promise<ClickWebhookResponse>`
    - Sign verifier: `verifySignature(payload: ClickWebhookPayload): boolean`

- [ ] **Step 1: Write failing tests for ClickWebhookHandler**
      In `packages/click/tests/webhook.test.ts`:
  - Test Action 0 (Prepare) with valid signature -> triggers `onPrepare`, returns `{ error: 0, error_note: 'Success', click_trans_id, merchant_trans_id, merchant_prepare_id }`.
  - Test Action 1 (Complete) with valid signature -> triggers `onComplete`, returns `{ error: 0, error_note: 'Success', click_trans_id, merchant_trans_id, merchant_confirm_id }`.
  - Test signature mismatch -> returns `{ error: -1, error_note: 'SIGN CHECK FAILED' }` with HTTP 200 format.
  - Test non-existent order or user rejection in `onPrepare` -> returns `{ error: -5, error_note: 'User does not exist' }`.
  - Test Web standard `Request` object input vs plain JavaScript object input.

- [ ] **Step 2: Run test to verify it fails**
      Run: `vp test packages/click/tests/webhook.test.ts`
      Expected: FAIL.

- [ ] **Step 3: Implement ClickWebhookHandler in `packages/click/src/webhook.ts`**
  - Implement request normalization (supports JSON string, parsed body object, or Web `Request`).
  - Implement Click MD5 signature verification:
    `md5(click_trans_id + service_id + secret_key + merchant_trans_id + (action === 1 ? merchant_prepare_id : '') + amount + action + sign_time)`
  - Dispatch to handler callbacks with proper error handling and Click response envelope formatting.

- [ ] **Step 4: Run tests to verify they pass**
      Run: `vp test packages/click/tests/webhook.test.ts`
      Expected: All webhook tests PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add packages/click
  git commit -m "feat(click): implement ClickWebhookHandler with prepare and complete support"
  ```

---

### Task 6: `@payuzs/sdk` - Umbrella Package & Tree-Shaking Verification

**Files:**

- Create: `packages/sdk/src/index.ts`
- Create: `packages/sdk/src/click.ts`
- Create: `packages/sdk/src/core.ts`
- Create: `packages/sdk/tests/exports.test.ts`
- Create: `packages/sdk/tests/treeshaking.test.ts`

**Interfaces:**

- Consumes: `@payuzs/core`, `@payuzs/click`
- Produces: Root barrel export and subpath exports (`@payuzs/sdk`, `@payuzs/sdk/click`, `@payuzs/sdk/core`).

- [ ] **Step 1: Write tests verifying exports and tree-shakeability**
      In `packages/sdk/tests/exports.test.ts`:
  - Verify `ClickClient`, `ClickWebhookHandler`, `PayuzsError` exported correctly from root.
  - Verify subpath imports work as expected.
    In `packages/sdk/tests/treeshaking.test.ts`:
  - Run a lightweight bundle check to ensure zero circular dependencies or unexpected side-effects.

- [ ] **Step 2: Run test to verify it fails**
      Run: `vp test packages/sdk/tests`
      Expected: FAIL.

- [ ] **Step 3: Implement exports in `packages/sdk/src/`**
  - `packages/sdk/src/index.ts`: Re-export all members from `@payuzs/click` and `@payuzs/core`.
  - `packages/sdk/src/click.ts`: Re-export from `@payuzs/click`.
  - `packages/sdk/src/core.ts`: Re-export from `@payuzs/core`.

- [ ] **Step 4: Run test to verify it passes**
      Run: `vp test packages/sdk/tests`
      Expected: PASS.

- [ ] **Step 5: Build all packages with Vite+ build command**
      Run: `vp build`
      Expected: Dist outputs generated with type declaration maps (`.d.ts`).

- [ ] **Step 6: Commit**
  ```bash
  git add packages/sdk
  git commit -m "feat(sdk): setup umbrella package with root and subpath exports"
  ```

---

### Task 7: Runnable Integration Examples (Express & Hono)

**Files:**

- Create: `apps/example-express/package.json`
- Create: `apps/example-express/tsconfig.json`
- Create: `apps/example-express/src/index.ts`
- Create: `apps/example-express/tests/server.test.ts`
- Create: `apps/example-hono/package.json`
- Create: `apps/example-hono/tsconfig.json`
- Create: `apps/example-hono/src/index.ts`
- Create: `apps/example-hono/tests/server.test.ts`

**Interfaces:**

- Consumes: `@payuzs/sdk`
- Produces: Working reference implementations showcasing how developers integrate Click in Node/Express and Edge/Hono.

- [ ] **Step 1: Create Express example integration**
  - Implement Express server with `/api/click/prepare` and `/api/click/complete` (or unified `/api/click/webhook`).
  - Write test sending synthetic Click Prepare and Complete requests to the Express app.

- [ ] **Step 2: Create Hono example integration**
  - Implement Hono application with `/api/click/webhook` using Web standard `Request`/`Response`.
  - Write test sending synthetic Click requests to `app.request('/api/click/webhook', ...)`.

- [ ] **Step 3: Run full workspace test and lint checks**
      Run: `vp check && vp test`
      Expected: All checks and tests pass across all packages and apps.

- [ ] **Step 4: Commit**
  ```bash
  git add apps
  git commit -m "feat(examples): add runnable Express and Hono integration examples"
  ```
