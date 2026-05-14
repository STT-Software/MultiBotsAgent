'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CompanyProfileResponse, UpdateCompanyProfileDto } from '@multibotagents/types';
import { InputField, SelectField } from './ProfileFieldGroup';
import {
  COMPANY_SIZE_OPTIONS,
  CATEGORY_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
} from '../types';
import type { CompanyProfileFormErrors, CompanyProfileFormValues } from '../types';

// Countries list (reused from register feature pattern)
const COUNTRIES = [
  { code: 'CO', name: 'Colombia' },
  { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'BR', name: 'Brasil' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'ES', name: 'España' },
  { code: 'PA', name: 'Panamá' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'HN', name: 'Honduras' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'NI', name: 'Nicaragua' },
] as const;

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.name }));

interface CompanyProfileFormProps {
  profile: CompanyProfileResponse;
  isSaving: boolean;
  errors: CompanyProfileFormErrors;
  serverError: string | null;
  saveSuccess: boolean;
  onSave: (data: UpdateCompanyProfileDto) => Promise<boolean>;
  onClearErrors: () => void;
  onClearSaveSuccess: () => void;
}

export function CompanyProfileForm({
  profile,
  isSaving,
  errors,
  serverError,
  saveSuccess,
  onSave,
  onClearErrors,
  onClearSaveSuccess,
}: CompanyProfileFormProps) {
  const [formValues, setFormValues] = useState<CompanyProfileFormValues>({
    name: profile.name,
    country: profile.country,
    category: profile.category,
    size: profile.size,
    phone: profile.phone || '',
    referralSource: profile.referralSource || '',
  });

  // Sync form values when profile changes (e.g., after logo update)
  useEffect(() => {
    setFormValues({
      name: profile.name,
      country: profile.country,
      category: profile.category,
      size: profile.size,
      phone: profile.phone || '',
      referralSource: profile.referralSource || '',
    });
  }, [profile]);

  // Auto-dismiss success toast
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(onClearSaveSuccess, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess, onClearSaveSuccess]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormValues((prev) => ({ ...prev, [name]: value }));
      onClearErrors();
    },
    [onClearErrors],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const data: UpdateCompanyProfileDto = {
        name: formValues.name.trim(),
        country: formValues.country,
        category: formValues.category as UpdateCompanyProfileDto['category'],
        size: formValues.size as UpdateCompanyProfileDto['size'],
        phone: formValues.phone.trim() || null,
        referralSource: (formValues.referralSource || null) as UpdateCompanyProfileDto['referralSource'],
      };

      await onSave(data);
    },
    [formValues, onSave],
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Server error banner */}
      {serverError && (
        <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400 flex items-center gap-2">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          {serverError}
        </div>
      )}

      {/* Success toast */}
      {saveSuccess && (
        <div role="status" className="rounded-lg border border-[#49df9a]/20 bg-[#49df9a]/5 p-3 text-sm text-[#49df9a] flex items-center gap-2">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Perfil actualizado correctamente.
        </div>
      )}

      {/* Fields in 2-column grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Name — full width */}
        <div className="sm:col-span-2">
          <InputField
            id="name"
            label="Nombre de empresa"
            value={formValues.name}
            onChange={handleChange}
            error={errors.name}
            required
            placeholder="Nombre de tu empresa"
            autoComplete="organization"
          />
        </div>

        {/* Country */}
        <SelectField
          id="country"
          label="País"
          value={formValues.country}
          options={COUNTRY_OPTIONS}
          onChange={handleChange}
          error={errors.country}
          required
          placeholder="Selecciona tu país"
        />

        {/* Category */}
        <SelectField
          id="category"
          label="Categoría de servicios"
          value={formValues.category}
          options={CATEGORY_OPTIONS}
          onChange={handleChange}
          error={errors.category}
          required
          placeholder="Selecciona la categoría"
        />

        {/* Size */}
        <SelectField
          id="size"
          label="Tamaño de empresa"
          value={formValues.size}
          options={COMPANY_SIZE_OPTIONS}
          onChange={handleChange}
          error={errors.size}
          required
          placeholder="Selecciona el tamaño"
        />

        {/* Phone */}
        <InputField
          id="phone"
          label="Teléfono"
          value={formValues.phone}
          onChange={handleChange}
          error={errors.phone}
          placeholder="+57 300 123 4567"
          type="tel"
          autoComplete="tel"
        />

        {/* Referral Source — full width */}
        <div className="sm:col-span-2">
          <SelectField
            id="referralSource"
            label="¿Cómo nos conociste?"
            value={formValues.referralSource}
            options={REFERRAL_SOURCE_OPTIONS}
            onChange={handleChange}
            error={errors.referralSource}
            placeholder="Selecciona una opción"
          />
        </div>
      </div>

      {/* Save button */}
      <button
        type="submit"
        disabled={isSaving}
        className={[
          'w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200',
          isSaving
            ? 'cursor-not-allowed bg-[#00bb7a]/30 text-[#00bb7a]/50'
            : 'bg-[#00bb7a] text-[#004329] hover:bg-[#49df9a] focus:outline-none focus:ring-2 focus:ring-[#00bb7a]/50',
        ].join(' ')}
        aria-busy={isSaving}
      >
        {isSaving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  );
}
