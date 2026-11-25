import type { WebhookHandler } from "@payuzs/core";
import { ClickError, getClickErrorMessage } from "./errors.js";
import { verifyClickSignature } from "./signature.js";
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

function parseFormUrlEncoded(text: string): Record<string, string> {
  const params = new URLSearchParams(text);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
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

  static createSuccessResponse(params: {
    clickTransId: number | string;
    merchantTransId: string;
    merchantPrepareId?: number | string;
    merchantConfirmId?: number | string;
  }): ClickWebhookResponse {
    const res: ClickWebhookResponse = {
      click_trans_id: params.clickTransId,
      merchant_trans_id: params.merchantTransId,
      error: ClickErrorCode.Success,
      error_note: "Success",
    };
    if (params.merchantPrepareId !== undefined) {
      res.merchant_prepare_id = params.merchantPrepareId;
    }
    if (params.merchantConfirmId !== undefined) {
      res.merchant_confirm_id = params.merchantConfirmId;
    }
    return res;
  }

  static createErrorResponse(params: {
    clickTransId: number | string;
    merchantTransId: string;
    error: ClickErrorCode;
    errorNote?: string;
    merchantPrepareId?: number | string;
  }): ClickWebhookResponse {
    const res: ClickWebhookResponse = {
      click_trans_id: params.clickTransId,
      merchant_trans_id: params.merchantTransId,
      error: params.error,
      error_note: params.errorNote ?? getClickErrorMessage(params.error),
    };
    if (params.merchantPrepareId !== undefined) {
      res.merchant_prepare_id = params.merchantPrepareId;
    }
    return res;
  }

  verifySignature(payload: ClickWebhookPayload): boolean {
    return verifyClickSignature(payload, this.secretKey);
  }

  private async parsePayload(
    request: ClickWebhookPayload | Request | string,
  ): Promise<ClickWebhookPayload> {
    if (typeof request === "string") {
      try {
        return JSON.parse(request) as ClickWebhookPayload;
      } catch {
        return parseFormUrlEncoded(request) as unknown as ClickWebhookPayload;
      }
    }
    if (typeof Request !== "undefined" && request instanceof Request) {
      const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
      if (contentType.includes("application/x-www-form-urlencoded")) {
        return parseFormUrlEncoded(await request.text()) as unknown as ClickWebhookPayload;
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
      return ClickWebhookHandler.createErrorResponse({
        clickTransId: 0,
        merchantTransId: "",
        error: ClickErrorCode.ErrorRequest,
        errorNote: "Invalid request payload",
      });
    }

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
      return ClickWebhookHandler.createErrorResponse({
        clickTransId: Number(payload?.click_trans_id ?? 0),
        merchantTransId: String(payload?.merchant_trans_id ?? ""),
        error: ClickErrorCode.ErrorRequest,
        errorNote: "Missing required click parameters",
      });
    }

    const clickTransId = Number(payload.click_trans_id);
    const merchantTransId = String(payload.merchant_trans_id);
    const action = Number(payload.action);

    if (String(payload.service_id) !== String(this.serviceId)) {
      return ClickWebhookHandler.createErrorResponse({
        clickTransId,
        merchantTransId,
        error: ClickErrorCode.SignCheckFailed,
        errorNote: "Service ID mismatch",
      });
    }

    if (!this.verifySignature(payload)) {
      return ClickWebhookHandler.createErrorResponse({
        clickTransId,
        merchantTransId,
        error: ClickErrorCode.SignCheckFailed,
        errorNote: "SIGN CHECK FAILED",
      });
    }

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
      return ClickWebhookHandler.createErrorResponse({
        clickTransId,
        merchantTransId,
        error: ClickErrorCode.TransactionCanceled,
        errorNote: payload.error_note ?? "Transaction cancelled",
      });
    }

    try {
      if (action === ClickAction.Prepare) {
        if (!this.onPrepare) {
          return ClickWebhookHandler.createErrorResponse({
            clickTransId,
            merchantTransId,
            error: ClickErrorCode.ActionNotFound,
            errorNote: "Action not found",
          });
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
          return ClickWebhookHandler.createErrorResponse({
            clickTransId,
            merchantTransId,
            error: result,
          });
        }

        return ClickWebhookHandler.createSuccessResponse({
          clickTransId,
          merchantTransId,
          merchantPrepareId: result.merchantPrepareId,
        });
      }

      if (action === ClickAction.Complete) {
        if (!this.onComplete) {
          return ClickWebhookHandler.createErrorResponse({
            clickTransId,
            merchantTransId,
            error: ClickErrorCode.ActionNotFound,
            errorNote: "Action not found",
          });
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
          return ClickWebhookHandler.createErrorResponse({
            clickTransId,
            merchantTransId,
            merchantPrepareId: payload.merchant_prepare_id,
            error: result,
          });
        }

        return ClickWebhookHandler.createSuccessResponse({
          clickTransId,
          merchantTransId,
          merchantPrepareId: payload.merchant_prepare_id,
          merchantConfirmId: result.merchantConfirmId,
        });
      }

      return ClickWebhookHandler.createErrorResponse({
        clickTransId,
        merchantTransId,
        error: ClickErrorCode.ActionNotFound,
        errorNote: `Unknown action: ${action}`,
      });
    } catch (err: unknown) {
      if (err instanceof ClickError) {
        return ClickWebhookHandler.createErrorResponse({
          clickTransId,
          merchantTransId,
          error: err.code,
          errorNote: err.errorNote,
        });
      }
      return ClickWebhookHandler.createErrorResponse({
        clickTransId,
        merchantTransId,
        error: ClickErrorCode.ErrorUpdate,
        errorNote: err instanceof Error ? err.message : "Internal error",
      });
    }
  }
}
