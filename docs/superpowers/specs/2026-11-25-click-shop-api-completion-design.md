# Design Doc: Complete Click Shop API Support in `@payuzs/click`

- **Status**: Draft (Awaiting Approval)
- **Author**: Antigravity
- **Date**: 2026-11-25
- **Scope**: `@payuzs/click` (Shop API Completeness & Hardening)

---

## 1. Intent & Context

The `@payuzs/click` package currently implements Click's two-step webhook protocol (`Prepare` and `Complete`), basic checkout URL generation, and status/refund operations. However, to achieve full completeness of Click's **Shop API** specifications, the package needs to handle all optional URL parameters (such as `communal_param` and arbitrary custom query parameters), harden MD5 signature verification against floating-point amount formatting discrepancies, and provide utilities for handling return URL redirects.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals

- **Flexible Checkout URL Options**: Extend `ClickPaymentUrlOptions` with `communalParam?: string` and `additionalParams?: Record<string, string | number>` in `generatePaymentUrl`.
- **Signature Verification Hardening**: Make `ClickWebhookHandler.verifySignature` resilient against amount formatting differences (supporting raw string amounts, unpadded numeric representations, and standard Click `toFixed(2)` formats).
- **Return URL Parameter Helper**: Add `ClickClient.parseReturnParams(input: string | URLSearchParams)` to easily extract and validate transaction status query params returned by Click to the merchant's `return_url`.
- **Static Response Builders**: Provide static helper methods on `ClickWebhookHandler` (`createSuccessResponse`, `createErrorResponse`) for direct or custom response generation.
- **Maintain 100% Test Coverage**: Add unit tests for all new options, edge cases, and helpers.

### Non-Goals

- Click Merchant API v2 outbound endpoints (Invoicing, Card Tokenization, and OFD fiscalization data endpoints) are out of scope for this task (Scope A).
- Frontend UI components or payment buttons.

### Anti-Goals

- Adding external 3rd-party dependencies.
- Breaking existing API interfaces or method signatures.

---

## 3. Approaches Considered

### Approach 1: Direct Extension & Signature Hardening (Selected)

- Extend existing interfaces and classes directly with typed optional parameters and helper methods.
- Update signature verification with dual-pass checking if amount is passed as a number.
- Add utility methods directly onto `ClickClient` and `ClickWebhookHandler`.
- _Trade-off_: Minimal footprint, backward-compatible, zero runtime overhead.

### Approach 2: Fluent URL Builder & Separate Validator Classes

- Introduce builder classes like `ClickPaymentUrlBuilder` and separate `ClickSignatureValidator`.
- _Trade-off_: Adds unnecessary class boilerplate, breaks uniformity across Payuzs SDK packages.

_Decision_: **Approach 1** selected by user.

---

## 4. Technical Design

### 4.1 URL Options & `generatePaymentUrl`

In `packages/click/src/types.ts`:

```typescript
export interface ClickPaymentUrlOptions {
  amount: number;
  transactionParam: string;
  returnUrl?: string;
  appLink?: boolean;
  communalParam?: string;
  additionalParams?: Record<string, string | number>;
}
```

In `packages/click/src/client.ts`:

- Append `communal_param` if provided.
- Append all entries from `additionalParams` to `URLSearchParams`.

### 4.2 Signature Verification Hardening

In `packages/click/src/webhook.ts`:

- Check signature using the raw string received in `payload.amount`.
- If signature check fails and `payload.amount` is a number or numeric string without two decimal places (e.g. `1000`), attempt verification with formatted amount (e.g. `1000.00` via `Number(payload.amount).toFixed(2)`).
- If either matches, signature verification succeeds.

### 4.3 Return URL Parsing Utility

In `packages/click/src/types.ts`:

```typescript
export interface ClickReturnParams {
  paymentId?: number;
  merchantTransId?: string;
  rawParams: Record<string, string>;
}
```

In `packages/click/src/client.ts`:

```typescript
parseReturnParams(input: string | URLSearchParams): ClickReturnParams
```

Parses redirect query string or full URL when the user is sent back from Click.

### 4.4 Static Response Builders

In `packages/click/src/webhook.ts`:

- `ClickWebhookHandler.createSuccessResponse(...)`
- `ClickWebhookHandler.createErrorResponse(...)`

---

## 5. What's Left to the Builder

- Implementing tests in `packages/click/tests/client.test.ts` and `packages/click/tests/webhook.test.ts`.
- Ensuring all tests pass with `vp test` and workspace checks pass with `vp check`.
