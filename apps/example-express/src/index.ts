import { ClickErrorCode, ClickWebhookHandler, type ClickWebhookPayload } from "@payuzs/sdk";
import express, { type Express } from "express";

export interface CreateExpressAppOptions {
  serviceId?: string;
  merchantId?: string;
  secretKey?: string;
}

export function createExpressApp(options?: CreateExpressAppOptions): Express {
  const app = express();
  app.use(express.json());

  const clickHandler = new ClickWebhookHandler({
    serviceId: options?.serviceId ?? "12345",
    merchantId: options?.merchantId ?? "67890",
    secretKey: options?.secretKey ?? "demo_secret",
    onPrepare: (ctx) => {
      // Mock order verification
      if (ctx.merchantTransId === "invalid_order") {
        return Promise.resolve(ClickErrorCode.UserNotFound);
      }
      return Promise.resolve({ merchantPrepareId: `prep_${ctx.merchantTransId}` });
    },
    onComplete: (ctx) => {
      // Mock order completion
      return Promise.resolve({ merchantConfirmId: `conf_${ctx.merchantTransId}` });
    },
  });

  app.post("/api/click/webhook", (req, res) => {
    void (async () => {
      const result = await clickHandler.handleRequest(req.body as ClickWebhookPayload);
      res.json(result);
    })();
  });

  return app;
}
