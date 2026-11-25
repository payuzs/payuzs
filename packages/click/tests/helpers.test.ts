import { md5 } from "@payuzs/core";
import { describe, expect, it } from "vite-plus/test";
import { ClickErrorCode } from "../src/types.js";
import { ClickWebhookHandler } from "../src/webhook.js";

describe("ClickWebhookHandler helpers & signature hardening", () => {
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

  it("verifies signature when amount is a decimal string matching integer format", () => {
    const handler = new ClickWebhookHandler({
      serviceId: "1234",
      merchantId: "5678",
      secretKey: "secret",
    });
    // Click computed sign_string with integer "1000"
    const signString = md5("9991234secretorder_1100002026-11-25 00:00:00");
    const payload = {
      click_trans_id: 999,
      service_id: "1234",
      merchant_trans_id: "order_1",
      amount: "1000.00", // payload had 1000.00
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
});
