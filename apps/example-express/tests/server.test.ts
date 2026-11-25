import type { Server } from "node:http";
import { md5 } from "@payuzs/sdk";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { createExpressApp } from "../src/index.js";

describe("Express Click Webhook Integration", () => {
  let server: Server;
  let baseUrl: string;
  const secretKey = "demo_secret";
  const serviceId = "12345";

  beforeAll(async () => {
    const app = createExpressApp({ secretKey, serviceId });
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address !== null && typeof address === "object") {
          baseUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  });

  it("handles Prepare (Action 0) request from Click", async () => {
    const signTime = "2026-11-25 12:00:00";
    const raw = `1001${serviceId}${secretKey}order_exp500000${signTime}`;
    const signString = md5(raw);

    const res = await globalThis.fetch(`${baseUrl}/api/click/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        click_trans_id: 1001,
        service_id: serviceId,
        merchant_trans_id: "order_exp",
        amount: "50000",
        action: 0,
        error: 0,
        sign_time: signTime,
        sign_string: signString,
      }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as { error: number; merchant_prepare_id?: string };
    expect(data.error).toBe(0);
    expect(data.merchant_prepare_id).toBe("prep_order_exp");
  });

  it("handles Complete (Action 1) request from Click", async () => {
    const signTime = "2026-11-25 12:01:00";
    const raw = `1001${serviceId}${secretKey}order_exp_2prep_exp_2500001${signTime}`;
    const signString = md5(raw);

    const res = await globalThis.fetch(`${baseUrl}/api/click/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        click_trans_id: 1001,
        service_id: serviceId,
        merchant_trans_id: "order_exp_2",
        merchant_prepare_id: "prep_exp_2",
        amount: "50000",
        action: 1,
        error: 0,
        sign_time: signTime,
        sign_string: signString,
      }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as { error: number; merchant_confirm_id?: string };
    expect(data.error).toBe(0);
    expect(data.merchant_confirm_id).toBe("conf_order_exp_2");
  });
});
