import { PayuzsError } from "@payuzs/core";
import { ClickErrorCode } from "./types.js";

const CLICK_ERROR_MESSAGES: Record<ClickErrorCode, string> = {
  [ClickErrorCode.Success]: "Success",
  [ClickErrorCode.SignCheckFailed]: "SIGN CHECK FAILED",
  [ClickErrorCode.IncorrectAmount]: "Incorrect parameter amount",
  [ClickErrorCode.ActionNotFound]: "Action not found",
  [ClickErrorCode.AlreadyPaid]: "Already paid",
  [ClickErrorCode.UserNotFound]: "User does not exist",
  [ClickErrorCode.TransactionNotFound]: "Transaction does not exist",
  [ClickErrorCode.ErrorUpdate]: "Failed to update user",
  [ClickErrorCode.ErrorRequest]: "Error in request from click",
  [ClickErrorCode.TransactionCanceled]: "Transaction cancelled",
};

export class ClickError extends PayuzsError {
  readonly code: ClickErrorCode;
  readonly errorNote: string;

  constructor(code: ClickErrorCode, errorNote?: string) {
    const note = errorNote ?? CLICK_ERROR_MESSAGES[code] ?? `Click error code ${code}`;
    super(`Click error [${code}]: ${note}`);
    this.name = "ClickError";
    this.code = code;
    this.errorNote = note;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
