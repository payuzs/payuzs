import { md5 } from "@payuzs/core";
import { describe, expect, it, vi } from "vite-plus/test";
import { ClickErrorCode } from "../src/types.js";
import { ClickWebhookHandler, type ClickWebhookConfig } from "../src/webhook.js";

describe("ClickWebhookHandler", () => {
  const secretKey = "test_secret_key";
  const serviceId = "12345";
  const merchantId = "67890";

  function createSignature(params: {
    click_trans_id: number | string;
    service_id: number | string;
    merchant_trans_id: string;
    merchant_prepare_id?: number | string;
    amount: number | string;
    action: number | string;
    sign_time: string;
  }): string {
    const preparePart =
      String(params.action) === "1" ? String(params.merchant_prepare_id ?? "") : "";
    const raw = `${params.click_trans_id}${params.service_id}${secretKey}${params.merchant_trans_id}${preparePart}${params.amount}${params.action}${params.sign_time}`;
    return md5(raw);
  }

  it("successfully handles Action 0 (Prepare)", async () => {
    const onPrepare = vi.fn<NonNullable<ClickWebhookConfig["onPrepare"]>>().mockResolvedValue({
      merchantPrepareId: "prep_999",
    });

    const handler = new ClickWebhookHandler({
      serviceId,
      merchantId,
      secretKey,
      onPrepare,
    });

    const payload = {
      click_trans_id: 112233,
      service_id: serviceId,
      click_paydoc_id: 445566,
      merchant_trans_id: "order_1",
      amount: "50000",
      action: 0,
      error: 0,
      sign_time: "2026-11-25 12:00:00",
      sign_string: "",
    };
    payload.sign_string = createSignature(payload);

    const response = await handler.handleRequest(payload);

    expect(onPrepare).toHaveBeenCalledWith(
      expect.objectContaining({
        clickTransId: 112233,
        serviceId,
        merchantTransId: "order_1",
        amount: 50000,
        signTime: "2026-11-25 12:00:00",
      }),
    );
    expect(response.error).toBe(ClickErrorCode.Success);
    expect(response.merchant_prepare_id).toBe("prep_999");
    expect(response.click_trans_id).toBe(112233);
  });

  it("successfully handles Action 1 (Complete)", async () => {
    const onComplete = vi.fn<NonNullable<ClickWebhookConfig["onComplete"]>>().mockResolvedValue({
      merchantConfirmId: "conf_888",
    });

    const handler = new ClickWebhookHandler({
      serviceId,
      merchantId,
      secretKey,
      onComplete,
    });

    const payload = {
      click_trans_id: 112233,
      service_id: serviceId,
      click_paydoc_id: 445566,
      merchant_trans_id: "order_1",
      merchant_prepare_id: "prep_999",
      amount: "50000",
      action: 1,
      error: 0,
      sign_time: "2026-11-25 12:01:00",
      sign_string: "",
    };
    payload.sign_string = createSignature(payload);

    const response = await handler.handleRequest(payload);

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        clickTransId: 112233,
        serviceId,
        merchantTransId: "order_1",
        merchantPrepareId: "prep_999",
        amount: 50000,
        signTime: "2026-11-25 12:01:00",
      }),
    );
    expect(response.error).toBe(ClickErrorCode.Success);
    expect(response.merchant_confirm_id).toBe("conf_888");
  });

  it("returns SignCheckFailed (-1) when signature does not match", async () => {
    const handler = new ClickWebhookHandler({
      serviceId,
      merchantId,
      secretKey,
    });

    const payload = {
      click_trans_id: 112233,
      service_id: serviceId,
      merchant_trans_id: "order_1",
      amount: "50000",
      action: 0,
      error: 0,
      sign_time: "2026-11-25 12:00:00",
      sign_string: "invalid_md5_hash",
    };

    const response = await handler.handleRequest(payload);
    expect(response.error).toBe(ClickErrorCode.SignCheckFailed);
    expect(response.error_note).toBe("SIGN CHECK FAILED");
  });

  it("handles standard Web Request object", async () => {
    const handler = new ClickWebhookHandler({
      serviceId,
      merchantId,
      secretKey,
      onPrepare: () => Promise.resolve({ merchantPrepareId: "prep_web_req" }),
    });

    const payload = {
      click_trans_id: 999111,
      service_id: serviceId,
      merchant_trans_id: "order_web",
      amount: "10000",
      action: 0,
      error: 0,
      sign_time: "2026-11-25 12:00:00",
      sign_string: "",
    };
    payload.sign_string = createSignature(payload);

    const request = new Request("https://api.myshop.uz/webhooks/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const response = await handler.handleRequest(request);
    expect(response.error).toBe(ClickErrorCode.Success);
    expect(response.merchant_prepare_id).toBe("prep_web_req");
  });
});
