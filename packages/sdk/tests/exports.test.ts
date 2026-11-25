import { describe, expect, it } from "vite-plus/test";
import * as RootSdk from "../src/index.js";
import * as ClickSdk from "../src/click.js";
import * as CoreSdk from "../src/core.js";

describe("@payuzs/sdk exports", () => {
  it("exports ClickClient and ClickWebhookHandler from root", () => {
    expect(RootSdk.ClickClient).toBeDefined();
    expect(RootSdk.ClickWebhookHandler).toBeDefined();
    expect(RootSdk.ClickErrorCode).toBeDefined();
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
  });

  it("exports only Core members from ./core entry", () => {
    expect(CoreSdk.PayuzsError).toBeDefined();
    expect(CoreSdk.PayuzsHttpClient).toBeDefined();
    expect(CoreSdk.md5).toBeDefined();
  });
});
