import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { ClickClient } from "../src/client.js";
import { ClickErrorCode } from "../src/types.js";

describe("ClickClient", () => {
  const originalFetch = globalThis.fetch;
  const config = {
    serviceId: "12345",
    merchantId: "67890",
    secretKey: "secret_test_key",
    merchantUserId: "99999",
  };

  beforeEach(() => {
    globalThis.fetch = vi.fn<typeof globalThis.fetch>();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("generatePaymentUrl", () => {
    it("generates correct web checkout URL with query parameters", () => {
      const client = new ClickClient(config);
      const url = client.generatePaymentUrl({
        amount: 50000,
        transactionParam: "order_1001",
        returnUrl: "https://myshop.uz/success",
      });

      expect(url).toContain("https://my.click.uz/services/pay?");
      expect(url).toContain("service_id=12345");
      expect(url).toContain("merchant_id=67890");
      expect(url).toContain("amount=50000");
      expect(url).toContain("transaction_param=order_1001");
      expect(url).toContain("return_url=" + encodeURIComponent("https://myshop.uz/success"));
    });

    it("generates app deep link when requested", () => {
      const client = new ClickClient(config);
      const url = client.generatePaymentUrl({
        amount: 25000.5,
        transactionParam: "order_1002",
        appLink: true,
      });

      expect(url.startsWith("clickuz://services/pay?")).toBe(true);
      expect(url).toContain("amount=25000.5");
    });
  });

  describe("Merchant API requests", () => {
    it("signs auth header correctly for checkTransaction", async () => {
      const client = new ClickClient(config);
      const mockStatusResponse = {
        error: ClickErrorCode.Success,
        error_note: "Success",
        payment_id: 112233,
        status: 2, // Paid
      };

      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockStatusResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await client.checkTransaction({ paymentId: 112233 });
      expect(result.error).toBe(ClickErrorCode.Success);
      expect(result.status).toBe(2);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/payment/status/12345/112233"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Auth: expect.stringMatching(/^99999:[0-9a-f]{40}:[0-9]+$/u),
          }),
        }),
      );
    });

    it("uses status_by_mti endpoint when querying by merchantTransId", async () => {
      const client = new ClickClient(config);
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 0, error_note: "Success" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await client.checkTransaction({
        merchantTransId: "order_xyz/1",
        paymentDate: "2026-11-25",
      });

      expect(result.error).toBe(0);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/payment/status_by_mti/12345/order_xyz%2F1/2026-11-25"),
        expect.anything(),
      );
    });

    it("throws PayuzsError when neither paymentId nor merchantTransId is provided", async () => {
      const client = new ClickClient(config);
      await expect(client.checkTransaction({})).rejects.toThrow(
        "Either paymentId or merchantTransId must be provided",
      );
    });

    it("handles refundTransaction endpoint with POST", async () => {
      const client = new ClickClient(config);
      const mockRefundResponse = {
        error: ClickErrorCode.Success,
        error_note: "Success",
        payment_id: 112233,
      };

      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockRefundResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await client.refundTransaction({ paymentId: 112233 });
      expect(result.error).toBe(0);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/payment/reversal/12345/112233"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });
});
