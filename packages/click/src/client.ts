import { PayuzsError, PayuzsHttpClient, sha1 } from "@payuzs/core";
import type {
  ClickCheckTransactionParams,
  ClickCheckTransactionResponse,
  ClickClientConfig,
  ClickPaymentUrlOptions,
  ClickRefundParams,
  ClickRefundResponse,
} from "./types.js";

const DEFAULT_CLICK_BASE_URL = "https://api.click.uz/v2/merchant";
const CLICK_WEB_CHECKOUT_URL = "https://my.click.uz/services/pay";
const CLICK_APP_CHECKOUT_URL = "clickuz://services/pay";

export class ClickClient {
  readonly serviceId: string;
  readonly merchantId: string;
  readonly secretKey: string;
  readonly merchantUserId?: string;
  private readonly http: PayuzsHttpClient;

  constructor(config: ClickClientConfig) {
    this.serviceId = config.serviceId;
    this.merchantId = config.merchantId;
    this.secretKey = config.secretKey;
    this.merchantUserId = config.merchantUserId;

    this.http = new PayuzsHttpClient({
      baseUrl: config.baseUrl ?? DEFAULT_CLICK_BASE_URL,
      timeoutMs: config.timeoutMs ?? 30000,
    });
  }

  generatePaymentUrl(options: ClickPaymentUrlOptions): string {
    const base = options.appLink === true ? CLICK_APP_CHECKOUT_URL : CLICK_WEB_CHECKOUT_URL;
    const params = new URLSearchParams({
      service_id: this.serviceId,
      merchant_id: this.merchantId,
      amount: String(options.amount),
      transaction_param: options.transactionParam,
    });

    if (options.returnUrl !== undefined && options.returnUrl !== "") {
      params.set("return_url", options.returnUrl);
    }

    return `${base}?${params.toString()}`;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (this.merchantUserId === undefined || this.merchantUserId === "") {
      throw new Error(
        "merchantUserId is required in ClickClientConfig to call Click Merchant Shop API",
      );
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const digest = await sha1(`${timestamp}${this.secretKey}`);
    return {
      Auth: `${this.merchantUserId}:${digest}:${timestamp}`,
    };
  }

  async checkTransaction(
    params: ClickCheckTransactionParams,
  ): Promise<ClickCheckTransactionResponse> {
    if (
      params.paymentId === undefined &&
      (params.merchantTransId === undefined || params.merchantTransId === "")
    ) {
      throw new PayuzsError("Either paymentId or merchantTransId must be provided");
    }

    const headers = await this.getAuthHeaders();
    let path: string;
    if (params.paymentId === undefined) {
      const date = params.paymentDate ?? new Date().toISOString().slice(0, 10);
      path = `/payment/status_by_mti/${encodeURIComponent(this.serviceId)}/${encodeURIComponent(params.merchantTransId ?? "")}/${encodeURIComponent(date)}`;
    } else {
      path = `/payment/status/${encodeURIComponent(this.serviceId)}/${encodeURIComponent(params.paymentId)}`;
    }

    return this.http.request<ClickCheckTransactionResponse>(path, {
      method: "GET",
      headers,
    });
  }

  async refundTransaction(params: ClickRefundParams): Promise<ClickRefundResponse> {
    const headers = await this.getAuthHeaders();
    return this.http.request<ClickRefundResponse>(
      `/payment/reversal/${this.serviceId}/${params.paymentId}`,
      {
        method: "DELETE",
        headers,
      },
    );
  }
}
