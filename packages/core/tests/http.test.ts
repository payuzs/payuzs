import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { PayuzsApiError, PayuzsError, PayuzsSignatureError } from "../src/errors/index.js";
import { PayuzsHttpClient } from "../src/http/client.js";

describe("core errors", () => {
  it("PayuzsError extends Error and preserves prototype", () => {
    const error = new PayuzsError("Something went wrong");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(PayuzsError);
    expect(error.name).toBe("PayuzsError");
    expect(error.message).toBe("Something went wrong");
  });

  it("PayuzsSignatureError extends PayuzsError", () => {
    const error = new PayuzsSignatureError("Invalid signature");
    expect(error).toBeInstanceOf(PayuzsError);
    expect(error).toBeInstanceOf(PayuzsSignatureError);
    expect(error.name).toBe("PayuzsSignatureError");
  });

  it("PayuzsApiError stores status and response body", () => {
    const error = new PayuzsApiError("Payment failed", 400, { code: -1 });
    expect(error).toBeInstanceOf(PayuzsError);
    expect(error).toBeInstanceOf(PayuzsApiError);
    expect(error.status).toBe(400);
    expect(error.body).toEqual({ code: -1 });
  });
});

describe("PayuzsHttpClient", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn<typeof globalThis.fetch>();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("performs GET request and parses JSON", async () => {
    const mockResponse = { success: true };
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new PayuzsHttpClient({ baseUrl: "https://api.example.com" });
    const result = await client.request<{ success: boolean }>("/test");

    expect(result).toEqual(mockResponse);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.example.com/test",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("performs POST request with JSON body", async () => {
    const mockResponse = { id: 123 };
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new PayuzsHttpClient();
    const result = await client.post<{ id: number }>("https://api.example.com/order", {
      amount: 1000,
    });

    expect(result).toEqual(mockResponse);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.example.com/order",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ amount: 1000 }),
      }),
    );
  });

  it("throws PayuzsApiError on HTTP error status", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new PayuzsHttpClient();
    await expect(client.request("https://api.example.com/private")).rejects.toThrow(PayuzsApiError);
  });
});
