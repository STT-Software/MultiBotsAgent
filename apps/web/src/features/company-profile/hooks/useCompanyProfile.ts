'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompanyProfileResponse, UpdateCompanyProfileDto } from '@multibotagents/types';
import { getProfile, updateProfile as updateProfileService } from '../services';
import type { ServiceError } from '../services/companyProfile.service';
import type { CompanyProfileFormErrors } from '../types';

interface UseCompanyProfileReturn {
  profile: CompanyProfileResponse | null;
  isLoading: boolean;
  isSaving: boolean;
  errors: CompanyProfileFormErrors;
  serverError: string | null;
  saveSuccess: boolean;
  updateProfile: (data: UpdateCompanyProfileDto) => Promise<boolean>;
  clearErrors: () => void;
  clearSaveSuccess: () => void;
  setProfile: React.Dispatch<React.SetStateAction<CompanyProfileResponse | null>>;
}

export function useCompanyProfile(): UseCompanyProfileReturn {
  const [profile, setProfile] = useState<CompanyProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<CompanyProfileFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const abortRef = useRef(false);

  // Fetch initial profile on mount
  useEffect(() => {
    const signal = { aborted: false };

    async function loadProfile() {
      setIsLoading(true);
      setServerError(null);

      try {
        const data = await getProfile();
        if (signal.aborted) return;
        setProfile(data);
      } catch (err: unknown) {
        if (signal.aborted) return;
        const serviceErr = err as ServiceError;
        setServerError(serviceErr.message || 'Error al cargar el perfil.');
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      signal.aborted = true;
    };
  }, []);

  // Update profile — preserves form values on server error
  const updateProfile = useCallback(async (data: UpdateCompanyProfileDto): Promise<boolean> => {
    setIsSaving(true);
    setErrors({});
    setServerError(null);
    setSaveSuccess(false);

    try {
      const updated = await updateProfileService(data);
      if (!abortRef.current) {
        setProfile(updated);
        setSaveSuccess(true);
      }
      return true;
    } catch (err: unknown) {
      if (abortRef.current) return false;

      const serviceErr = err as ServiceError;

      if (serviceErr.fields) {
        setErrors(serviceErr.fields as CompanyProfileFormErrors);
      } else {
        setServerError(serviceErr.message || 'Error al guardar los cambios.');
      }
      return false;
    } finally {
      if (!abortRef.current) {
        setIsSaving(false);
      }
    }
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setServerError(null);
  }, []);

  const clearSaveSuccess = useCallback(() => {
    setSaveSuccess(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  return {
    profile,
    isLoading,
    isSaving,
    errors,
    serverError,
    saveSuccess,
    updateProfile,
    clearErrors,
    clearSaveSuccess,
    setProfile,
  };
}
