export interface HttpClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface BasePaymentGateway {
  readonly name: string;
}

export interface WebhookHandler<TPayload = unknown, TResponse = unknown> {
  handleRequest(request: TPayload | Request | string): Promise<TResponse>;
}
