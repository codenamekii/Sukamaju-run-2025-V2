declare module "midtrans-client" {
  export interface TransactionStatusResponse {
    transaction_status: string;
    payment_type: string;
    bank?: string;
    store?: string;
    va_numbers?: { bank: string; va_number: string }[];
    [key: string]: unknown;
  }

  export class Snap {
    constructor(config: {
      isProduction: boolean;
      serverKey: string;
      clientKey: string;
    });

    createTransaction(params: Record<string, unknown>): Promise<{
      token: string;
      redirect_url: string;
      [key: string]: unknown;
    }>;
  }

  export class CoreApi {
    constructor(config: {
      isProduction: boolean;
      serverKey: string;
      clientKey: string;
    });

    charge(params: Record<string, unknown>): Promise<unknown>;
    capture(params: Record<string, unknown>): Promise<unknown>;
    transaction: {
      status(orderId: string): Promise<TransactionStatusResponse>;
    };
  }
}
declare module "midtrans-client" {
  export interface TransactionStatusResponse {
    transaction_status: string;
    payment_type: string;
    bank?: string;
    store?: string;
    va_numbers?: { bank: string; va_number: string }[];
    [key: string]: unknown;
  }

  export class Snap {
    constructor(config: {
      isProduction: boolean;
      serverKey: string;
      clientKey: string;
    });

    createTransaction(params: Record<string, unknown>): Promise<{
      token: string;
      redirect_url: string;
      [key: string]: unknown;
    }>;
  }

  export class CoreApi {
    constructor(config: {
      isProduction: boolean;
      serverKey: string;
      clientKey: string;
    });

    charge(params: Record<string, unknown>): Promise<unknown>;
    capture(params: Record<string, unknown>): Promise<unknown>;
    transaction: {
      status(orderId: string): Promise<TransactionStatusResponse>;
    };
  }
}