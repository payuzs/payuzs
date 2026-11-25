import { md5, type WebhookHandler } from "@payuzs/core";
import { ClickError } from "./errors.js";
import {
  ClickAction,
  ClickErrorCode,
  type ClickWebhookPayload,
  type ClickWebhookResponse,
} from "./types.js";

export interface ClickPrepareContext {
  clickTransId: number;
  serviceId: string;
  merchantTransId: string;
  amount: number;
  signTime: string;
  rawPayload: ClickWebhookPayload;
}

export interface ClickCompleteContext {
  clickTransId: number;
  serviceId: string;
  merchantTransId: string;
  merchantPrepareId?: string;
  amount: number;
  signTime: string;
  rawPayload: ClickWebhookPayload;
}

export interface ClickPrepareResult {
  merchantPrepareId: string;
}

export interface ClickCompleteResult {
  merchantConfirmId: string;
}

export interface ClickWebhookConfig {
  serviceId: string;
  merchantId: string;
  secretKey: string;
  onPrepare?: (ctx: ClickPrepareContext) => Promise<ClickPrepareResult | ClickErrorCode>;
  onComplete?: (ctx: ClickCompleteContext) => Promise<ClickCompleteResult | ClickErrorCode>;
}

export class ClickWebhookHandler implements WebhookHandler<
  ClickWebhookPayload,
  ClickWebhookResponse
> {
  readonly serviceId: string;
  readonly merchantId: string;
  readonly secretKey: string;
  private readonly onPrepare?: (
    ctx: ClickPrepareContext,
  ) => Promise<ClickPrepareResult | ClickErrorCode>;
  private readonly onComplete?: (
    ctx: ClickCompleteContext,
  ) => Promise<ClickCompleteResult | ClickErrorCode>;

  constructor(config: ClickWebhookConfig) {
    this.serviceId = config.serviceId;
    this.merchantId = config.merchantId;
    this.secretKey = config.secretKey;
    this.onPrepare = config.onPrepare;
    this.onComplete = config.onComplete;
  }

  verifySignature(payload: ClickWebhookPayload): boolean {
    const action = Number(payload.action);
    const preparePart =
      action === ClickAction.Complete ? String(payload.merchant_prepare_id ?? "") : "";
    const signString = `${payload.click_trans_id}${payload.service_id}${this.secretKey}${payload.merchant_trans_id}${preparePart}${payload.amount}${payload.action}${payload.sign_time}`;
    const calculatedHash = md5(signString);
    return calculatedHash.toLowerCase() === String(payload.sign_string).toLowerCase();
  }

  private async parsePayload(
    request: ClickWebhookPayload | Request | string,
  ): Promise<ClickWebhookPayload> {
    if (typeof request === "string") {
      return JSON.parse(request) as ClickWebhookPayload;
    }
    if (typeof Request !== "undefined" && request instanceof Request) {
      return (await request.json()) as ClickWebhookPayload;
    }
    return request as ClickWebhookPayload;
  }

  async handleRequest(
    request: ClickWebhookPayload | Request | string,
  ): Promise<ClickWebhookResponse> {
    const payload = await this.parsePayload(request);
    const clickTransId = Number(payload.click_trans_id);
    const merchantTransId = String(payload.merchant_trans_id);
    const action = Number(payload.action);

    // 1. Signature verification
    if (!this.verifySignature(payload)) {
      return {
        click_trans_id: clickTransId,
        merchant_trans_id: merchantTransId,
        error: ClickErrorCode.SignCheckFailed,
        error_note: "SIGN CHECK FAILED",
      };
    }

    // 2. Click incoming error check
    if (Number(payload.error) < 0) {
      return {
        click_trans_id: clickTransId,
        merchant_trans_id: merchantTransId,
        error: Number(payload.error) as ClickErrorCode,
        error_note: payload.error_note ?? "Error from click",
      };
    }

    // 3. Action Dispatcher
    try {
      if (action === ClickAction.Prepare) {
        if (!this.onPrepare) {
          return {
            click_trans_id: clickTransId,
            merchant_trans_id: merchantTransId,
            error: ClickErrorCode.ActionNotFound,
            error_note: "Action not found",
          };
        }

        const result = await this.onPrepare({
          clickTransId,
          serviceId: String(payload.service_id),
          merchantTransId,
          amount: Number(payload.amount),
          signTime: String(payload.sign_time),
          rawPayload: payload,
        });

        if (typeof result === "number") {
          return {
            click_trans_id: clickTransId,
            merchant_trans_id: merchantTransId,
            error: result,
            error_note: "Prepare rejected",
          };
        }

        return {
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          merchant_prepare_id: result.merchantPrepareId,
          error: ClickErrorCode.Success,
          error_note: "Success",
        };
      }

      if (action === ClickAction.Complete) {
        if (!this.onComplete) {
          return {
            click_trans_id: clickTransId,
            merchant_trans_id: merchantTransId,
            error: ClickErrorCode.ActionNotFound,
            error_note: "Action not found",
          };
        }

        const result = await this.onComplete({
          clickTransId,
          serviceId: String(payload.service_id),
          merchantTransId,
          merchantPrepareId:
            payload.merchant_prepare_id === undefined
              ? undefined
              : String(payload.merchant_prepare_id),
          amount: Number(payload.amount),
          signTime: String(payload.sign_time),
          rawPayload: payload,
        });

        if (typeof result === "number") {
          return {
            click_trans_id: clickTransId,
            merchant_trans_id: merchantTransId,
            merchant_prepare_id: payload.merchant_prepare_id,
            error: result,
            error_note: "Complete rejected",
          };
        }

        return {
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          merchant_prepare_id: payload.merchant_prepare_id,
          merchant_confirm_id: result.merchantConfirmId,
          error: ClickErrorCode.Success,
          error_note: "Success",
        };
      }

      return {
        click_trans_id: clickTransId,
        merchant_trans_id: merchantTransId,
        error: ClickErrorCode.ActionNotFound,
        error_note: `Unknown action: ${action}`,
      };
    } catch (err: unknown) {
      if (err instanceof ClickError) {
        return {
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          error: err.code,
          error_note: err.errorNote,
        };
      }
      return {
        click_trans_id: clickTransId,
        merchant_trans_id: merchantTransId,
        error: ClickErrorCode.ErrorUpdate,
        error_note: err instanceof Error ? err.message : "Internal error",
      };
    }
  }
}
