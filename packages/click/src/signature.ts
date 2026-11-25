import { md5 } from "@payuzs/core";
import { ClickAction, type ClickWebhookPayload } from "./types.js";

export function verifyClickSignature(payload: ClickWebhookPayload, secretKey: string): boolean {
  const action = Number(payload.action);
  const preparePart =
    action === ClickAction.Complete ? String(payload.merchant_prepare_id ?? "") : "";
  const expectedHash = String(payload.sign_string).toLowerCase();

  // 1. Check with raw string amount
  const rawAmount = String(payload.amount);
  const sign = (amt: string) =>
    md5(
      `${payload.click_trans_id}${payload.service_id}${secretKey}${payload.merchant_trans_id}${preparePart}${amt}${payload.action}${payload.sign_time}`,
    ).toLowerCase();

  if (sign(rawAmount) === expectedHash) {
    return true;
  }

  // 2. If mismatch and amount is numeric, check with 2 decimal places (e.g. 1000 -> 1000.00)
  const num = Number(payload.amount);
  if (!Number.isNaN(num)) {
    const fixed = num.toFixed(2);
    if (fixed !== rawAmount && sign(fixed) === expectedHash) {
      return true;
    }
    if (rawAmount.includes(".")) {
      const intStr = String(Math.floor(num));
      if (
        intStr !== rawAmount &&
        intStr !== fixed &&
        num === Math.floor(num) &&
        sign(intStr) === expectedHash
      ) {
        return true;
      }
    }
  }

  return false;
}
