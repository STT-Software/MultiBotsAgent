export interface FormData {
  companyName: string;
  email: string;
  password: string;
  country: string;
  category: string;
  size: string;
  phoneCountryCode: string;
  phone: string;
  referralSource: string;
}

export interface FormErrors {
  companyName?: string;
  email?: string;
  password?: string;
  country?: string;
  category?: string;
  size?: string;
}

export interface TouchedFields {
  companyName: boolean;
  email: boolean;
  password: boolean;
  country: boolean;
  category: boolean;
  size: boolean;
}

export type StepId = 1 | 2 | 3;
