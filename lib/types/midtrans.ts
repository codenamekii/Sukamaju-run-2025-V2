export type MidtransNotification = {
  order_id: string;
  status_code: string;        // string angka, contoh: "200"
  gross_amount: string;       // string angka, contoh: "180000.00"
  signature_key: string;

  transaction_status?: "capture" | "settlement" | "cancel" | "deny" | "expire" | "pending" | string;
  payment_type?: string;
  bank?: string;
  store?: string;
  va_numbers?: { bank: string; va_number: string }[];

  // tambahkan field lain bila dipakai
};

export type MidtransStatusResponse = {
  transaction_status: MidtransNotification["transaction_status"];
  payment_type?: string;
  bank?: string;
  store?: string;
  va_numbers?: { bank: string; va_number: string }[];
  // simpan semua field lain apa adanya ke DB (JSON)
  [k: string]: unknown;
};
