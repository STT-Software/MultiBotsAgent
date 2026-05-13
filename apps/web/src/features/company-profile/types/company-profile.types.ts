import {
  CompanySize,
  ServiceCategory,
  ReferralSource,
} from '@multibotagents/types';

// ─── Form State Types ────────────────────────────────────────────────────────

/** Valores del formulario de perfil de empresa. */
export interface CompanyProfileFormValues {
  name: string;
  country: string;
  category: string;
  size: string;
  phone: string;
  referralSource: string;
}

/** Errores de validación por campo del formulario. */
export interface CompanyProfileFormErrors {
  name?: string;
  country?: string;
  category?: string;
  size?: string;
  phone?: string;
  referralSource?: string;
}

/** Estados de carga del feature. */
export interface CompanyProfileLoadingState {
  isLoading: boolean;
  isSaving: boolean;
  isUploading: boolean;
}

// ─── Constants for Selects ───────────────────────────────────────────────────

/** Opciones de tamaño de empresa para el select. */
export const COMPANY_SIZE_OPTIONS: { value: CompanySize; label: string }[] = [
  { value: CompanySize.ONE, label: '1 empleado' },
  { value: CompanySize.TWO_TO_FIVE, label: '2-5 empleados' },
  { value: CompanySize.SIX_TO_TEN, label: '6-10 empleados' },
  { value: CompanySize.ELEVEN_TO_TWENTY, label: '11-20 empleados' },
  { value: CompanySize.TWENTY_PLUS, label: '20+ empleados' },
];

/** Opciones de categoría de servicios para el select. */
export const CATEGORY_OPTIONS: { value: ServiceCategory; label: string }[] = [
  { value: ServiceCategory.CUSTOMER_SUPPORT, label: 'Soporte al cliente' },
  { value: ServiceCategory.SALES, label: 'Ventas' },
  { value: ServiceCategory.MARKETING, label: 'Marketing' },
  { value: ServiceCategory.HEALTHCARE, label: 'Salud' },
  { value: ServiceCategory.EDUCATION, label: 'Educación' },
  { value: ServiceCategory.REAL_ESTATE, label: 'Bienes raíces' },
  { value: ServiceCategory.ECOMMERCE, label: 'E-commerce' },
  { value: ServiceCategory.FINANCE, label: 'Finanzas' },
  { value: ServiceCategory.HOSPITALITY, label: 'Hospitalidad' },
  { value: ServiceCategory.LEGAL, label: 'Legal' },
  { value: ServiceCategory.LOGISTICS, label: 'Logística' },
  { value: ServiceCategory.OTHER, label: 'Otro' },
];

/** Opciones de fuente de referencia para el select. */
export const REFERRAL_SOURCE_OPTIONS: { value: ReferralSource; label: string }[] = [
  { value: ReferralSource.YOUTUBE, label: 'YouTube' },
  { value: ReferralSource.INSTAGRAM, label: 'Instagram' },
  { value: ReferralSource.FACEBOOK, label: 'Facebook' },
  { value: ReferralSource.GOOGLE, label: 'Google' },
  { value: ReferralSource.REFERRAL, label: 'Referido' },
  { value: ReferralSource.OTHER, label: 'Otro' },
];
