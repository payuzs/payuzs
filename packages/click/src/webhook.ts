import { md5, type WebhookHandler } from "@payuzs/core";
import { ClickError, getClickErrorMessage } from "./errors.js";
import {
  ClickAction,
  ClickErrorCode,
  type ClickCompleteContext,
  type ClickCompleteResult,
  type ClickPrepareContext,
  type ClickPrepareResult,
  type ClickWebhookConfig,
  type ClickWebhookPayload,
  type ClickWebhookResponse,
} from "./types.js";

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
  private readonly onCancel?: (
    ctx: ClickCompleteContext,
  ) => Promise<ClickCompleteResult | ClickErrorCode | void>;

  constructor(config: ClickWebhookConfig) {
    this.serviceId = config.serviceId;
    this.merchantId = config.merchantId;
    this.secretKey = config.secretKey;
    this.onPrepare = config.onPrepare;
    this.onComplete = config.onComplete;
    this.onCancel = config.onCancel;
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
      try {
        return JSON.parse(request) as ClickWebhookPayload;
      } catch {
        const params = new URLSearchParams(request);
        const result: Record<string, string> = {};
        for (const [key, value] of params.entries()) {
          result[key] = value;
        }
        return result as unknown as ClickWebhookPayload;
      }
    }
    if (typeof Request !== "undefined" && request instanceof Request) {
      const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const text = await request.text();
        const params = new URLSearchParams(text);
        const result: Record<string, string> = {};
        for (const [key, value] of params.entries()) {
          result[key] = value;
        }
        return result as unknown as ClickWebhookPayload;
      }
      return (await request.json()) as ClickWebhookPayload;
    }
    return request as ClickWebhookPayload;
  }

  async handleRequest(
    request: ClickWebhookPayload | Request | string,
  ): Promise<ClickWebhookResponse> {
    let payload: ClickWebhookPayload;
    try {
      payload = await this.parsePayload(request);
    } catch {
      return {
        click_trans_id: 0,
        merchant_trans_id: "",
        error: ClickErrorCode.ErrorRequest,
        error_note: "Invalid request payload",
      };
    }

    // Validate required fields
    if (
      typeof payload !== "object" ||
      payload === null ||
      payload.click_trans_id === undefined ||
      payload.service_id === undefined ||
      payload.merchant_trans_id === undefined ||
      payload.amount === undefined ||
      payload.action === undefined ||
      payload.sign_string === undefined
    ) {
      return {
        click_trans_id: Number(payload?.click_trans_id ?? 0),
        merchant_trans_id: String(payload?.merchant_trans_id ?? ""),
        error: ClickErrorCode.ErrorRequest,
        error_note: "Missing required click parameters",
      };
    }

    const clickTransId = Number(payload.click_trans_id);
    const merchantTransId = String(payload.merchant_trans_id);
    const action = Number(payload.action);

    // Validate service_id matches configuration
    if (String(payload.service_id) !== String(this.serviceId)) {
      return {
        click_trans_id: clickTransId,
        merchant_trans_id: merchantTransId,
        error: ClickErrorCode.SignCheckFailed,
        error_note: "Service ID mismatch",
      };
    }

    // 1. Signature verification
    if (!this.verifySignature(payload)) {
      return {
        click_trans_id: clickTransId,
        merchant_trans_id: merchantTransId,
        error: ClickErrorCode.SignCheckFailed,
        error_note: "SIGN CHECK FAILED",
      };
    }

    // 2. Click incoming error/cancellation check
    if (Number(payload.error) < 0) {
      if (action === ClickAction.Complete && this.onCancel) {
        try {
          await this.onCancel({
            clickTransId,
            serviceId: String(payload.service_id),
            merchantTransId,
            merchantPrepareId:
              payload.merchant_prepare_id === undefined
                ? undefined
                : String(payload.merchant_prepare_id),
            amount: Number(payload.amount),
            signTime: String(payload.sign_time),
            error: Number(payload.error),
            errorNote: payload.error_note,
            rawPayload: payload,
          });
        } catch {
          // Keep response clean
        }
      }
      return {
        click_trans_id: clickTransId,
        merchant_trans_id: merchantTransId,
        error: ClickErrorCode.TransactionCanceled,
        error_note: payload.error_note ?? "Transaction cancelled",
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
            error_note: getClickErrorMessage(result),
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
            error_note: getClickErrorMessage(result),
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
