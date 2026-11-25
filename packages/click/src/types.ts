export enum ClickErrorCode {
  Success = 0,
  SignCheckFailed = -1,
  IncorrectAmount = -2,
  ActionNotFound = -3,
  AlreadyPaid = -4,
  UserNotFound = -5,
  TransactionNotFound = -6,
  ErrorUpdate = -7,
  ErrorRequest = -8,
  TransactionCanceled = -9,
}

export enum ClickAction {
  Prepare = 0,
  Complete = 1,
}

export interface ClickClientConfig {
  serviceId: string;
  merchantId: string;
  secretKey: string;
  merchantUserId?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface ClickPaymentUrlOptions {
  amount: number;
  transactionParam: string;
  returnUrl?: string;
  appLink?: boolean;
}

export interface ClickCheckTransactionParams {
  paymentId?: number;
  merchantTransId?: string;
}

export interface ClickCheckTransactionResponse {
  error: ClickErrorCode;
  error_note: string;
  payment_id?: number;
  status?: number;
  status_note?: string;
}

export interface ClickRefundParams {
  paymentId: number;
}

export interface ClickRefundResponse {
  error: ClickErrorCode;
  error_note: string;
  payment_id?: number;
}

export interface ClickWebhookPayload {
  click_trans_id: number | string;
  service_id: number | string;
  click_paydoc_id?: number | string;
  merchant_trans_id: string;
  merchant_prepare_id?: number | string;
  amount: number | string;
  action: number | string;
  error: number | string;
  error_note?: string;
  sign_time: string;
  sign_string: string;
}

export interface ClickWebhookResponse {
  click_trans_id: number | string;
  merchant_trans_id: string;
  merchant_prepare_id?: number | string;
  merchant_confirm_id?: number | string;
  error: ClickErrorCode;
  error_note: string;
}
