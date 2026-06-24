'use client';

import { useCallback, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { COUNTRIES } from '../constants';
import { REFERRAL_LABELS } from '../constants';
import { ChevronDown } from '@/components/ui/ChevronDown';
import type { FormData } from '../types';

interface VerificationStepProps {
  formData: FormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onCaptchaChange: (token: string | null) => void;
}

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

export function VerificationStep({ formData, onChange, onCaptchaChange }: VerificationStepProps) {
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const handleCaptchaChange = useCallback(
    (token: string | null) => {
      onCaptchaChange(token);
    },
    [onCaptchaChange],
  );

  const handleCaptchaExpired = useCallback(() => {
    onCaptchaChange(null);
  }, [onCaptchaChange]);

  return (
    <>
      {/* Phone (optional) */}
      <div className="space-y-1.5">
        <label htmlFor="phone" className="block text-sm font-medium text-gray-300">
          Teléfono <span className="text-gray-500">(opcional)</span>
        </label>
        <div className="flex gap-2">
          <div className="relative w-24 shrink-0 sm:w-28">
            <select
              id="phoneCountryCode"
              name="phoneCountryCode"
              value={formData.phoneCountryCode}
              onChange={onChange}
              className="w-full appearance-none rounded-lg border border-gray-700 bg-[#0d1117]/80 backdrop-blur-sm px-2 py-2.5 text-sm text-gray-100 outline-none transition-all duration-200 hover:border-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 sm:px-3 sm:py-3"
              aria-label="Código de país del teléfono"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.phoneCode}>
                  {c.phoneCode}
                </option>
              ))}
            </select>
            <ChevronDown />
          </div>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            value={formData.phone}
            onChange={onChange}
            placeholder="56 1234 5678"
            className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-[#0d1117]/80 backdrop-blur-sm px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all duration-200 hover:border-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 sm:px-4 sm:py-3"
          />
        </div>
      </div>

      {/* Referral Source (optional) */}
      <div className="space-y-1.5">
        <label htmlFor="referralSource" className="block text-sm font-medium text-gray-300">
          ¿Cómo nos conociste? <span className="text-gray-500">(opcional)</span>
        </label>
        <div className="relative">
          <select
            id="referralSource"
            name="referralSource"
            value={formData.referralSource}
            onChange={onChange}
            className={
              'w-full appearance-none rounded-lg border border-gray-700 bg-[#0d1117]/80 backdrop-blur-sm px-3 py-2.5 text-sm outline-none transition-all duration-200 hover:border-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 sm:px-4 sm:py-3' +
              (formData.referralSource === '' ? ' text-gray-500' : ' text-gray-100')
            }
          >
            <option value="">Selecciona una opción</option>
            {Object.entries(REFERRAL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown />
        </div>
      </div>

      {/* Google reCAPTCHA v2 */}
      <div className="flex justify-center" aria-label="Verificación CAPTCHA">
        {RECAPTCHA_SITE_KEY ? (
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={RECAPTCHA_SITE_KEY}
            theme="dark"
            onChange={handleCaptchaChange}
            onExpired={handleCaptchaExpired}
          />
        ) : (
          <p className="text-xs text-yellow-400">
            reCAPTCHA no configurado (falta NEXT_PUBLIC_RECAPTCHA_SITE_KEY)
          </p>
        )}
      </div>
    </>
  );
}
