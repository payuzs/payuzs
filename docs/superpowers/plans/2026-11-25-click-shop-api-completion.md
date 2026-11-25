# Click Shop API Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully complete and harden the Click Shop API in `@payuzs/click` by adding flexible checkout URL parameters, hardening MD5 signature verification for float/string amounts, providing return URL parsing utilities, and adding static response builders.

**Architecture:** Extend `@payuzs/click` types, `ClickClient`, and `ClickWebhookHandler` with backward-compatible enhancements. Test-driven development with Vitest verifying every new option, fallback, and utility against official Click Shop API behavior.

**Tech Stack:** TypeScript, Vite+ (`vp`), Vitest, Oxlint, Oxfmt.

**Spec:** [docs/superpowers/specs/2026-11-25-click-shop-api-completion-design.md](file:///home/nozim/Work/payuzs/docs/superpowers/specs/2026-11-25-click-shop-api-completion-design.md)

---

## Global Constraints

- **Dependency floor**: Zero 3rd-party runtime dependencies (`dependencies: {}` in `@payuzs/core`; `@payuzs/click` depends only on `@payuzs/core`).
- **Toolchain**: Vite+ (`vp check`, `vp test`, `vp build`).
- **Runtime Target**: Node 18+, Bun, Deno, and Edge environments (Cloudflare Workers).
- **Package Manifest**: Maintain `"sideEffects": false` and properly configured `exports` maps.

---

## Review Focus

1. **URL parameter collisions**: If `additionalParams` contains reserved keys (e.g. `service_id` or `amount`), `generatePaymentUrl` must prioritize explicit config/options and not allow accidental corruption of critical parameters.
2. **Numeric amount float precision**: Converting float amounts like `1000.5` to string must format to `1000.50` when testing against 2-decimal signatures without introducing JavaScript floating-point representation bugs (e.g. `0.1 + 0.2`).
3. **Empty / malformed return URL strings**: `ClickClient.parseReturnParams` must safely handle malformed strings or inputs lacking standard Click query params without throwing uncaught runtime exceptions.
4. **Duplicate signature pass overhead**: Signature verification fallback should only run when the initial check fails and the amount is numeric, ensuring zero performance penalty on standard valid requests.
5. **Static response builder immutability**: Static helper responses from `ClickWebhookHandler` must strictly conform to Click's expected response interface (`ClickWebhookResponse`).

---

## Tasks

### Task 1: Checkout URL Options & Return URL Parsing

**Files:**

- Modify: `packages/click/src/types.ts`
- Modify: `packages/click/src/client.ts`
- Test: `packages/click/tests/client.test.ts`

**Interfaces:**

- Produces:
  - `ClickPaymentUrlOptions.communalParam?: string`
  - `ClickPaymentUrlOptions.additionalParams?: Record<string, string | number>`
  - `interface ClickReturnParams { paymentId?: number; merchantTransId?: string; rawParams: Record<string, string>; }`
  - `ClickClient.parseReturnParams(input: string | URLSearchParams): ClickReturnParams`

- [ ] **Step 1: Write failing tests for new checkout URL options and return URL parsing**
      In `packages/click/tests/client.test.ts`:

  ```typescript
  it("includes communal_param and additionalParams in generated payment url", () => {
    const client = new ClickClient({ serviceId: "1234", merchantId: "5678", secretKey: "secret" });
    const url = client.generatePaymentUrl({
      amount: 15000,
      transactionParam: "order_1",
      communalParam: "comm_99",
      additionalParams: { promo: "test", lang: "uz" },
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("communal_param")).toBe("comm_99");
    expect(parsed.searchParams.get("promo")).toBe("test");
    expect(parsed.searchParams.get("lang")).toBe("uz");
  });

  it("parses return url parameters safely", () => {
    const client = new ClickClient({ serviceId: "1234", merchantId: "5678", secretKey: "secret" });
    const result = client.parseReturnParams(
      "https://myshop.uz/return?payment_id=98765&merchant_trans_id=order_1&status=2",
    );
    expect(result.paymentId).toBe(98765);
    expect(result.merchantTransId).toBe("order_1");
    expect(result.rawParams.status).toBe("2");
  });

  it("handles malformed or empty return params gracefully", () => {
    const client = new ClickClient({ serviceId: "1234", merchantId: "5678", secretKey: "secret" });
    const result = client.parseReturnParams("");
    expect(result.paymentId).toBeUndefined();
    expect(result.merchantTransId).toBeUndefined();
    expect(result.rawParams).toEqual({});
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
      Run: `vp test packages/click/tests/client.test.ts`
      Expected: FAIL (compilation errors or missing properties).

- [ ] **Step 3: Implement `communalParam`, `additionalParams`, and `parseReturnParams`**
  - In `packages/click/src/types.ts`: Add `communalParam?: string; additionalParams?: Record<string, string | number>;` to `ClickPaymentUrlOptions`. Add `ClickReturnParams` interface.
  - In `packages/click/src/client.ts`: Update `generatePaymentUrl` to append `communal_param` and `additionalParams`. Implement `parseReturnParams(input: string | URLSearchParams): ClickReturnParams`.

- [ ] **Step 4: Run test to verify it passes**
      Run: `vp test packages/click/tests/client.test.ts`
      Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add packages/click/src/types.ts packages/click/src/client.ts packages/click/tests/client.test.ts
  git commit -m "feat(click): add communalParam, additionalParams and parseReturnParams helper"
  ```

---

### Task 2: Hardened Signature Verification & Static Webhook Response Builders

**Files:**

- Modify: `packages/click/src/webhook.ts`
- Test: `packages/click/tests/webhook.test.ts`

**Interfaces:**

- Produces:
  - `ClickWebhookHandler.createSuccessResponse(params: { clickTransId: number | string; merchantTransId: string; merchantPrepareId?: number | string; merchantConfirmId?: number | string; }): ClickWebhookResponse`
  - `ClickWebhookHandler.createErrorResponse(params: { clickTransId: number | string; merchantTransId: string; error: ClickErrorCode; errorNote?: string; merchantPrepareId?: number | string; }): ClickWebhookResponse`
  - Enhanced `ClickWebhookHandler.verifySignature(payload: ClickWebhookPayload): boolean` supporting 2-decimal numeric amount formatting fallback.

- [ ] **Step 1: Write failing tests for hardened signature verification and static builders**
      In `packages/click/tests/webhook.test.ts`:

  ```typescript
  it("verifies signature successfully when amount was parsed as a number without decimals", () => {
    const handler = new ClickWebhookHandler({
      serviceId: "1234",
      merchantId: "5678",
      secretKey: "secret",
    });
    // Click computed sign_string with "1000.00"
    const signString = md5("9991234secretorder_11000.0002026-11-25 00:00:00");
    const payload = {
      click_trans_id: 999,
      service_id: "1234",
      merchant_trans_id: "order_1",
      amount: 1000, // parsed as number 1000 instead of "1000.00"
      action: 0,
      sign_time: "2026-11-25 00:00:00",
      sign_string: signString,
      error: 0,
    };
    expect(handler.verifySignature(payload)).toBe(true);
  });

  it("creates static success response", () => {
    const res = ClickWebhookHandler.createSuccessResponse({
      clickTransId: 100,
      merchantTransId: "order_1",
      merchantPrepareId: 200,
    });
    expect(res).toEqual({
      click_trans_id: 100,
      merchant_trans_id: "order_1",
      merchant_prepare_id: 200,
      error: ClickErrorCode.Success,
      error_note: "Success",
    });
  });

  it("creates static error response", () => {
    const res = ClickWebhookHandler.createErrorResponse({
      clickTransId: 100,
      merchantTransId: "order_1",
      error: ClickErrorCode.UserNotFound,
    });
    expect(res).toEqual({
      click_trans_id: 100,
      merchant_trans_id: "order_1",
      error: ClickErrorCode.UserNotFound,
      error_note: "User does not exist",
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
      Run: `vp test packages/click/tests/webhook.test.ts`
      Expected: FAIL.

- [ ] **Step 3: Implement signature hardening and static response helpers in `packages/click/src/webhook.ts`**
  - In `verifySignature`:
    - First check with raw `String(payload.amount)`.
    - If mismatch and `payload.amount` is numeric, try with `Number(payload.amount).toFixed(2)` (e.g. `1000.00`).
    - Also try without decimal places if `toFixed(2)` was in raw string but original was integer.
  - Implement static methods `ClickWebhookHandler.createSuccessResponse` and `ClickWebhookHandler.createErrorResponse`.

- [ ] **Step 4: Run tests to verify they pass**
      Run: `vp test packages/click/tests/webhook.test.ts`
      Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add packages/click/src/webhook.ts packages/click/tests/webhook.test.ts
  git commit -m "feat(click): harden verifySignature for amount decimals and add static response builders"
  ```

---

### Task 3: Workspace Verification & Exports Test

**Files:**

- Modify: `packages/sdk/tests/exports.test.ts`

**Interfaces:**

- Verifies: `@payuzs/sdk` correctly re-exports `ClickReturnParams` and all new types and methods from `@payuzs/click`.

- [ ] **Step 1: Update umbrella package exports tests**
      In `packages/sdk/tests/exports.test.ts`:
  - Ensure `ClickClient` and `ClickWebhookHandler` exports include new methods.
  - Test instantiation and type checking.

- [ ] **Step 2: Run full workspace test suite and lint/type checks**
      Run: `vp check && vp test && vp build`
      Expected: All packages pass typechecking, linting, tests, and build dual ESM/CJS outputs.

- [ ] **Step 3: Commit**
  ```bash
  git add packages/sdk/tests/exports.test.ts
  git commit -m "test(sdk): verify umbrella package exports for click enhancements"
  ```
