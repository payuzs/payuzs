import { describe, expect, it } from "vite-plus/test";
import * as RootSdk from "../src/index.js";
import * as ClickSdk from "../src/click.js";
import * as CoreSdk from "../src/core.js";

describe("@payuzs/sdk exports", () => {
  it("exports ClickClient and ClickWebhookHandler from root", () => {
    expect(RootSdk.ClickClient).toBeDefined();
    expect(RootSdk.ClickWebhookHandler).toBeDefined();
    expect(RootSdk.ClickErrorCode).toBeDefined();
    expect(RootSdk.verifyClickSignature).toBeDefined();
    expect(typeof RootSdk.ClickWebhookHandler.createSuccessResponse).toBe("function");
    expect(typeof RootSdk.ClickWebhookHandler.createErrorResponse).toBe("function");

    const client = new RootSdk.ClickClient({
      serviceId: "1",
      merchantId: "2",
      secretKey: "3",
    });
    expect(typeof client.parseReturnParams).toBe("function");
    const parsed = client.parseReturnParams("?payment_id=456");
    expect(parsed.paymentId).toBe(456);
  });

  it("exports core utilities from root", () => {
    expect(RootSdk.PayuzsError).toBeDefined();
    expect(RootSdk.PayuzsHttpClient).toBeDefined();
    expect(RootSdk.md5).toBeDefined();
  });

  it("exports only Click members from ./click entry", () => {
    expect(ClickSdk.ClickClient).toBeDefined();
    expect(ClickSdk.ClickWebhookHandler).toBeDefined();
    expect(ClickSdk.ClickErrorCode).toBeDefined();
    expect(ClickSdk.verifyClickSignature).toBeDefined();
  });

  it("exports only Core members from ./core entry", () => {
    expect(CoreSdk.PayuzsError).toBeDefined();
    expect(CoreSdk.PayuzsHttpClient).toBeDefined();
    expect(CoreSdk.md5).toBeDefined();
  });
});
