// components/ui/whatsapp-input.tsx
"use client";

import { formatWhatsAppNumber, parseWhatsAppInput } from '@/lib/utils/whatsapp-formatter';
import { AlertCircle, CheckCircle, Phone } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface WhatsAppInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidChange?: (isValid: boolean) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  error?: string;
  disabled?: boolean;
  showValidation?: boolean;
}

export default function WhatsAppInput({
  value,
  onChange,
  onValidChange,
  label = "WhatsApp Number",
  placeholder = "08xx or +628xx",
  required = false,
  className = "",
  error: externalError,
  disabled = false,
  showValidation = true
}: WhatsAppInputProps) {
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const [validation, setValidation] = useState<ReturnType<typeof parseWhatsAppInput>>();

  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (touched || focused) {
      const result = parseWhatsAppInput(internalValue);
      setValidation(result);

      if (onValidChange) {
        onValidChange(result.isValid);
      }
    }
  }, [internalValue, touched, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // Allow only numbers, +, and spaces for better UX
    const cleaned = input.replace(/[^\d\s+]/g, '');
    setInternalValue(cleaned);

    // If input looks complete (10+ digits), format it
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length >= 10) {
      const formatted = formatWhatsAppNumber(cleaned);
      onChange(formatted);
    } else {
      onChange(cleaned);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    setTouched(true);

    // Format on blur
    if (internalValue) {
      const formatted = formatWhatsAppNumber(internalValue);
      setInternalValue(formatted);
      onChange(formatted);
    }
  };

  const handleFocus = () => {
    setFocused(true);
  };

  const showError = touched && !focused && validation && !validation.isValid;
  const showSuccess = touched && validation && validation.isValid;
  const displayError = externalError || (showError && validation?.error);

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Phone className="h-5 w-5 text-gray-400" />
        </div>

        <input
          type="tel"
          value={internalValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            block w-full pl-10 pr-10 py-2 border rounded-lg
            focus:outline-none focus:ring-2 transition-colors
            ${disabled ? 'bg-gray-50 text-gray-500' : 'bg-white'}
            ${showError
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : showSuccess
                ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }
          `}
        />

        {showValidation && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {showError && (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            {showSuccess && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
          </div>
        )}
      </div>

      {/* Helper Text */}
      {!displayError && !touched && (
        <p className="text-xs text-gray-500">
          Format: 08xxx atau +628xxx (nomor Indonesia)
        </p>
      )}

      {/* Error Message */}
      {displayError && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {displayError}
        </p>
      )}

      {/* Success Message */}
      {showSuccess && validation && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Valid: {validation.display}
        </p>
      )}

      {/* Format Examples */}
      {focused && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mt-1">
          <p className="font-medium mb-1">Contoh format yang valid:</p>
          <ul className="space-y-0.5">
            <li>• 081234567890</li>
            <li>• +6281234567890</li>
            <li>• 6281234567890</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// ===================================
// Usage Example in Registration Form
// ===================================

/*
// In your registration form component:

import WhatsAppInput from '@/components/ui/whatsapp-input';

function RegistrationForm() {
  const [whatsapp, setWhatsapp] = useState('');
  const [isWhatsAppValid, setIsWhatsAppValid] = useState(false);

  return (
    <form>
      <WhatsAppInput
        value={whatsapp}
        onChange={setWhatsapp}
        onValidChange={setIsWhatsAppValid}
        label="WhatsApp Number"
        required={true}
        placeholder="Masukkan nomor WhatsApp"
      />
      
      <button
        type="submit"
        disabled={!isWhatsAppValid}
        className={`px-4 py-2 rounded ${
          isWhatsAppValid 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        Submit
      </button>
    </form>
  );
}
*/