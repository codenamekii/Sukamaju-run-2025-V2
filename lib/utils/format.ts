export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(dateObj);
}