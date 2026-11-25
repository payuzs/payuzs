import { PayuzsError } from "./base.js";

export class PayuzsSignatureError extends PayuzsError {
  constructor(message = "Invalid payment gateway signature") {
    super(message);
    this.name = "PayuzsSignatureError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
