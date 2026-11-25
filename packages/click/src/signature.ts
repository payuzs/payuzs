import { md5 } from "@payuzs/core";
import { ClickAction, type ClickWebhookPayload } from "./types.js";

export function verifyClickSignature(payload: ClickWebhookPayload, secretKey: string): boolean {
  if (
    payload === null ||
    payload === undefined ||
    typeof payload !== "object" ||
    typeof payload.sign_string !== "string" ||
    payload.sign_string.trim() === "" ||
    payload.amount === null ||
    payload.amount === undefined ||
    String(payload.amount).trim() === ""
  ) {
    return false;
  }

  const action = Number(payload.action);
  const preparePart =
    action === ClickAction.Complete ? String(payload.merchant_prepare_id ?? "") : "";
  const expectedHash = payload.sign_string.trim().toLowerCase();

  const rawAmount = String(payload.amount);
  const sign = (amt: string) =>
    md5(
      `${payload.click_trans_id}${payload.service_id}${secretKey}${payload.merchant_trans_id}${preparePart}${amt}${payload.action}${payload.sign_time}`,
    ).toLowerCase();

  if (sign(rawAmount) === expectedHash) {
    return true;
  }

  const num = Number(payload.amount);
  if (Number.isFinite(num)) {
    const fixed = num.toFixed(2);
    if (fixed !== rawAmount && sign(fixed) === expectedHash) {
      return true;
    }
    const unpadded = String(num);
    if (unpadded !== rawAmount && unpadded !== fixed && sign(unpadded) === expectedHash) {
      return true;
    }
  }

  return false;
}
