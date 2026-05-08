import {
  CompanySize,
  ServiceCategory,
  ReferralSource,
} from '@multibotagents/types';

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  [ServiceCategory.CUSTOMER_SUPPORT]: 'Soporte al cliente',
  [ServiceCategory.SALES]: 'Ventas',
  [ServiceCategory.MARKETING]: 'Marketing',
  [ServiceCategory.HEALTHCARE]: 'Salud',
  [ServiceCategory.EDUCATION]: 'Educación',
  [ServiceCategory.REAL_ESTATE]: 'Bienes raíces',
  [ServiceCategory.ECOMMERCE]: 'E-commerce',
  [ServiceCategory.FINANCE]: 'Finanzas',
  [ServiceCategory.HOSPITALITY]: 'Hospitalidad',
  [ServiceCategory.LEGAL]: 'Legal',
  [ServiceCategory.LOGISTICS]: 'Logística',
  [ServiceCategory.OTHER]: 'Otro',
};

export const SIZE_LABELS: Record<CompanySize, string> = {
  [CompanySize.ONE]: '1 empleado',
  [CompanySize.TWO_TO_FIVE]: '2-5 empleados',
  [CompanySize.SIX_TO_TEN]: '6-10 empleados',
  [CompanySize.ELEVEN_TO_TWENTY]: '11-20 empleados',
  [CompanySize.TWENTY_PLUS]: '20+ empleados',
};

export const REFERRAL_LABELS: Record<ReferralSource, string> = {
  [ReferralSource.YOUTUBE]: 'YouTube',
  [ReferralSource.INSTAGRAM]: 'Instagram',
  [ReferralSource.FACEBOOK]: 'Facebook',
  [ReferralSource.GOOGLE]: 'Google',
  [ReferralSource.REFERRAL]: 'Referido',
  [ReferralSource.OTHER]: 'Otro',
};

export const STEPS = [
  { id: 1, label: 'Empresa' },
  { id: 2, label: 'Cuenta' },
  { id: 3, label: 'Verificación' },
] as const;
