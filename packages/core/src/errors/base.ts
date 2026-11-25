export class PayuzsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayuzsError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
