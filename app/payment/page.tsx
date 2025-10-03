// app/payment/page.tsx
import PaymentClient from './paymentClient';

export default function PaymentPage() {
  // Page utama hanya render client component
  return <PaymentClient />;
}