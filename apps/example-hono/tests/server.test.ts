import { md5 } from "@payuzs/sdk";
import { describe, expect, it } from "vite-plus/test";
import { createHonoApp } from "../src/index.js";

describe("Hono Click Webhook Integration", () => {
  const secretKey = "demo_secret";
  const serviceId = "12345";
  const app = createHonoApp({ secretKey, serviceId });

  it("handles Prepare (Action 0) via standard Web Request/Response", async () => {
    const signTime = "2026-11-25 12:00:00";
    const raw = `2001${serviceId}${secretKey}order_hono500000${signTime}`;
    const signString = md5(raw);

    const req = new Request("http://localhost/api/click/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        click_trans_id: 2001,
        service_id: serviceId,
        merchant_trans_id: "order_hono",
        amount: "50000",
        action: 0,
        error: 0,
        sign_time: signTime,
        sign_string: signString,
      }),
    });

    const res = await app.request(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as { error: number; merchant_prepare_id?: string };
    expect(data.error).toBe(0);
    expect(data.merchant_prepare_id).toBe("prep_order_hono");
  });

  it("handles Complete (Action 1) via standard Web Request/Response", async () => {
    const signTime = "2026-11-25 12:01:00";
    const raw = `2001${serviceId}${secretKey}order_hono_2prep_hono_2500001${signTime}`;
    const signString = md5(raw);

    const req = new Request("http://localhost/api/click/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        click_trans_id: 2001,
        service_id: serviceId,
        merchant_trans_id: "order_hono_2",
        merchant_prepare_id: "prep_hono_2",
        amount: "50000",
        action: 1,
        error: 0,
        sign_time: signTime,
        sign_string: signString,
      }),
    });

    const res = await app.request(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as { error: number; merchant_confirm_id?: string };
    expect(data.error).toBe(0);
    expect(data.merchant_confirm_id).toBe("conf_order_hono_2");
  });
});
