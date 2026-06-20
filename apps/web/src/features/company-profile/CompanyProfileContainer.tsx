'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Camera, Shield } from 'lucide-react';
import type { CompanyProfileResponse } from '@multibotagents/types';
import { useCompanyProfile } from './hooks';
import { useLogoUpload } from './hooks';
import { CompanyProfileForm } from './components';
import { LogoUploader } from './components';

export default function CompanyProfileContainer() {
  const router = useRouter();
  const {
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
  } = useCompanyProfile();

  const handleProfileUpdate = useCallback(
    (updated: CompanyProfileResponse) => {
      if (updated) {
        setProfile(updated);
      }
    },
    [setProfile],
  );

  const {
    isUploading,
    uploadProgress,
    error: logoError,
    upload,
    removeLogo,
    clearError: clearLogoError,
  } = useLogoUpload({ onProfileUpdate: handleProfileUpdate });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <ProfileHeader onBack={() => router.back()} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <SkeletonCard className="h-[240px] stagger-1" />
          </div>
          <div className="lg:col-span-2">
            <SkeletonCard className="h-[480px] stagger-2" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (!profile && serverError) {
    return (
      <div className="flex flex-col gap-6">
        <ProfileHeader onBack={() => router.back()} />
        <div className="relative overflow-hidden rounded-xl border border-red-500/20 bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-8 text-center stagger-1">
          <p className="text-sm text-red-400 mb-4">{serverError}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[#242c27] border border-[#3c4a41] px-4 py-2 text-sm text-[#dde5dc] hover:bg-[#2f3731] transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <ProfileHeader onBack={() => router.back()} />

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — Logo + Info */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Logo Card */}
          <div className="relative overflow-hidden rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-6 transition-all duration-200 hover:border-[rgba(0,187,122,0.3)] hover:shadow-[inset_0_0_12px_rgba(0,187,122,0.04)] stagger-1">
            {/* Background icon */}
            <div className="absolute -right-3 -bottom-3 opacity-[0.06]">
              <Camera className="h-[100px] w-[100px] text-[#dde5dc]" strokeWidth={2.5} />
            </div>

            <h3 className="font-[family-name:var(--font-inter)] text-sm font-medium text-[#bbcabe] mb-4">
              Logo de empresa
            </h3>

            <LogoUploader
              currentLogo={profile.logo}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              error={logoError}
              onUpload={upload}
              onRemove={removeLogo}
              onClearError={clearLogoError}
            />
          </div>

          {/* Account Info Card */}
          <div className="relative overflow-hidden rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-6 transition-all duration-200 hover:border-[rgba(0,187,122,0.3)] hover:shadow-[inset_0_0_12px_rgba(0,187,122,0.04)] stagger-2">
            <div className="absolute -right-3 -bottom-3 opacity-[0.06]">
              <Shield className="h-[100px] w-[100px] text-[#dde5dc]" strokeWidth={2.5} />
            </div>

            <h3 className="font-[family-name:var(--font-inter)] text-sm font-medium text-[#bbcabe] mb-4">
              Cuenta
            </h3>

            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-mono text-[#bbcabe]/60 uppercase tracking-wider">Email</p>
                <p className="text-sm text-[#dde5dc] mt-0.5">{profile.email}</p>
              </div>
              <div>
                <p className="text-[11px] font-mono text-[#bbcabe]/60 uppercase tracking-wider">Estado</p>
                <p className="text-sm text-[#49df9a] mt-0.5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#49df9a] animate-pulse" />
                  Activa
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column — Form */}
        <div className="lg:col-span-2">
          <div className="relative overflow-hidden rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-6 transition-all duration-200 hover:border-[rgba(0,187,122,0.3)] hover:shadow-[inset_0_0_12px_rgba(0,187,122,0.04)] stagger-3">
            {/* Background icon */}
            <div className="absolute -right-4 -bottom-4 opacity-[0.06]">
              <Building2 className="h-[140px] w-[140px] text-[#dde5dc]" strokeWidth={2.5} />
            </div>

            <h3 className="font-[family-name:var(--font-inter)] text-sm font-medium text-[#bbcabe] mb-6">
              Información de la empresa
            </h3>

            <CompanyProfileForm
              profile={profile}
              isSaving={isSaving}
              errors={errors}
              serverError={serverError}
              saveSuccess={saveSuccess}
              onSave={updateProfile}
              onClearErrors={clearErrors}
              onClearSaveSuccess={clearSaveSuccess}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProfileHeader({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onBack}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] text-[#bbcabe] transition-all duration-200 hover:border-[rgba(0,187,122,0.4)] hover:text-[#49df9a]"
        aria-label="Volver"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
      </button>
      <div>
        <h1 className="font-[family-name:var(--font-geist-sans)] text-[28px] font-bold leading-[1.2] text-[#dde5dc]">
          Perfil de empresa
        </h1>
        <p className="font-[family-name:var(--font-inter)] text-sm text-[#bbcabe]">
          Administra la información y logo de tu empresa.
        </p>
      </div>
    </div>
  );
}

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-6 ${className}`}>
      <div className="animate-pulse space-y-4">
        <div className="h-3 w-24 rounded bg-[#242c27]" />
        <div className="h-8 w-full rounded bg-[#242c27]" />
        <div className="h-8 w-3/4 rounded bg-[#242c27]" />
        <div className="h-8 w-full rounded bg-[#242c27]" />
      </div>
    </div>
  );
}
