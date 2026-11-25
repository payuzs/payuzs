import { ClickErrorCode, ClickWebhookHandler } from "@payuzs/sdk";
import { Hono } from "hono";

export interface CreateHonoAppOptions {
  serviceId?: string;
  merchantId?: string;
  secretKey?: string;
}

export function createHonoApp(options?: CreateHonoAppOptions): Hono {
  const app = new Hono();

  const clickHandler = new ClickWebhookHandler({
    serviceId: options?.serviceId ?? "12345",
    merchantId: options?.merchantId ?? "67890",
    secretKey: options?.secretKey ?? "demo_secret",
    onPrepare: (ctx) => {
      if (ctx.merchantTransId === "invalid_order") {
        return Promise.resolve(ClickErrorCode.UserNotFound);
      }
      return Promise.resolve({ merchantPrepareId: `prep_${ctx.merchantTransId}` });
    },
    onComplete: (ctx) => {
      return Promise.resolve({ merchantConfirmId: `conf_${ctx.merchantTransId}` });
    },
  });

  app.post("/api/click/webhook", async (c) => {
    const result = await clickHandler.handleRequest(c.req.raw);
    return c.json(result);
  });

  return app;
}
