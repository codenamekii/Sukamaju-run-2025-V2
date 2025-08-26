import { RegistrationFormData } from '@/lib/types/registration';

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || '';

export class RegistrationService {
  // Check if email is available
  static async checkEmailAvailability(email: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      return data.available;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  }

  // Get current quota
  static async getQuota() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/quota`);
      const data = await response.json();
      return data.quota;
    } catch (error) {
      console.error('Error fetching quota:', error);
      return null;
    }
  }

  // Submit individual registration
  static async submitRegistration(formData: RegistrationFormData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registrasi gagal');
      }

      return data;
    } catch (error) {
      console.error('Error submitting registration:', error);
      throw error;
    }
  }

  // Create payment transaction
  static async createPaymentTransaction(registrationCode: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal membuat transaksi');
      }

      return data;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  // Check payment status
  static async checkPaymentStatus(orderId: string) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/payment/status?order_id=${orderId}`
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking payment status:', error);
      return null;
    }
  }

  // Get registration details
  static async getRegistrationDetails(code: string) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/registration?code=${code}`
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching registration:', error);
      return null;
    }
  }
}