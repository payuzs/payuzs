import { PayuzsApiError } from "../errors/api.js";
import type { HttpClientOptions, RequestOptions } from "../types/index.js";

export class PayuzsHttpClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options?: HttpClientOptions) {
    this.baseUrl = options?.baseUrl?.replace(/\/+$/u, "") ?? "";
    this.timeoutMs = options?.timeoutMs ?? 30000;
    this.defaultHeaders = {
      Accept: "application/json",
      ...options?.headers,
    };
  }

  async request<T>(pathOrUrl: string, options?: RequestOptions): Promise<T> {
    const isAbsolute = /^https?:\/\//iu.test(pathOrUrl);
    const url = isAbsolute
      ? pathOrUrl
      : `${this.baseUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...options?.headers,
    };

    let body: BodyInit | undefined;
    if (options?.body !== undefined) {
      if (
        typeof options.body === "string" ||
        options.body instanceof FormData ||
        options.body instanceof URLSearchParams
      ) {
        body = options.body;
      } else {
        headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
        body = JSON.stringify(options.body);
      }
    }

    const timeout = options?.timeoutMs ?? this.timeoutMs;
    const signal = AbortSignal.timeout(timeout);

    let response: Response;
    try {
      response = await globalThis.fetch(url, {
        method: options?.method ?? "GET",
        headers,
        body,
        signal,
      });
    } catch (err: unknown) {
      if (err instanceof PayuzsApiError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new PayuzsApiError(`Network request failed: ${message}`, 0, err);
    }

    let responseData: unknown;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      throw new PayuzsApiError(
        `HTTP request to ${url} failed with status ${response.status}`,
        response.status,
        responseData,
      );
    }

    return responseData as T;
  }

  get<T>(url: string, options?: Omit<RequestOptions, "method">): Promise<T> {
    return this.request<T>(url, { ...options, method: "GET" });
  }

  post<T>(
    url: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ): Promise<T> {
    return this.request<T>(url, { ...options, method: "POST", body });
  }
}
