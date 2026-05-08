import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RegisterForm } from './RegisterForm';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fillStep1(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Nombre de empresa/), 'Mi Empresa');
  await user.selectOptions(screen.getByLabelText(/^País/), 'CO');
  await user.selectOptions(screen.getByLabelText(/Categoría de servicios/), 'customer_support');
  await user.selectOptions(screen.getByLabelText(/Tamaño de empresa/), '1');
}

async function goToStep2(user: ReturnType<typeof userEvent.setup>) {
  await fillStep1(user);
  await user.click(screen.getByRole('button', { name: /Siguiente/ }));
}

async function fillStep2(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Email/), 'test@empresa.com');
  await user.type(screen.getByLabelText(/Contraseña/), 'Password1');
}

async function goToStep3(user: ReturnType<typeof userEvent.setup>) {
  await goToStep2(user);
  await fillStep2(user);
  await user.click(screen.getByRole('button', { name: /Siguiente/ }));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RegisterForm (wizard)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ─── 1. Initial rendering (Step 1) ──────────────────────────────────────

  describe('Step 1 — Empresa (initial step)', () => {
    it('renders step 1 fields: nombre empresa, país, categoría, tamaño', () => {
      render(<RegisterForm />);

      expect(screen.getByLabelText(/Nombre de empresa/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^País/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Categoría de servicios/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Tamaño de empresa/)).toBeInTheDocument();
    });

    it('does NOT render step 2 or 3 fields initially', () => {
      render(<RegisterForm />);

      expect(screen.queryByLabelText(/^Email/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Contraseña/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/^Teléfono/)).not.toBeInTheDocument();
    });

    it('shows progress indicator with 3 steps', () => {
      render(<RegisterForm />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '1');
      expect(progress).toHaveAttribute('aria-valuemax', '3');
    });

    it('shows "Siguiente" button (not "Crear cuenta") on step 1', () => {
      render(<RegisterForm />);
      expect(screen.getByRole('button', { name: /Siguiente/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Crear cuenta$/ })).not.toBeInTheDocument();
    });

    it('does NOT show "Atrás" button on step 1', () => {
      render(<RegisterForm />);
      expect(screen.queryByRole('button', { name: /Atrás/ })).not.toBeInTheDocument();
    });

    it('stays on step 1 when required fields are empty and user clicks Siguiente', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      await user.click(screen.getByRole('button', { name: /Siguiente/ }));

      // Still on step 1
      expect(screen.getByLabelText(/Nombre de empresa/)).toBeInTheDocument();
      expect(screen.queryByLabelText(/^Email/)).not.toBeInTheDocument();
      // Errors shown
      expect(screen.getByText('El nombre de empresa es obligatorio')).toBeInTheDocument();
    });

    it('advances to step 2 when all step 1 fields are valid', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      await goToStep2(user);

      expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Nombre de empresa/)).not.toBeInTheDocument();
    });

    it('title uses fluid typography via clamp', () => {
      render(<RegisterForm />);
      const title = screen.getByRole('heading', { name: /Crear cuenta empresarial/ });
      expect(title.className).toMatch(/text-\[clamp/);
    });
  });

  // ─── 2. Step 2 — Cuenta ─────────────────────────────────────────────────

  describe('Step 2 — Cuenta', () => {
    it('renders email and password fields', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);
      await goToStep2(user);

      expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Contraseña/)).toBeInTheDocument();
    });

    it('shows "Atrás" and "Siguiente" buttons on step 2', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);
      await goToStep2(user);

      expect(screen.getByRole('button', { name: /Atrás/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Siguiente/ })).toBeInTheDocument();
    });

    it('"Atrás" returns to step 1 preserving data', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);
      await goToStep2(user);

      await user.click(screen.getByRole('button', { name: /Atrás/ }));

      const companyInput = screen.getByLabelText(/Nombre de empresa/) as HTMLInputElement;
      expect(companyInput.value).toBe('Mi Empresa');
    });

    it('shows error for invalid email format on blur', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);
      await goToStep2(user);

      const emailInput = screen.getByLabelText(/^Email/);
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      expect(screen.getByText('Formato de email inválido')).toBeInTheDocument();
    });

    it('shows error for short password on blur', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);
      await goToStep2(user);

      const passwordInput = screen.getByLabelText(/Contraseña/);
      await user.type(passwordInput, 'Short1');
      await user.tab();

      expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
    });

    it('shows password strength indicator when typing', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);
      await goToStep2(user);

      await user.type(screen.getByLabelText(/Contraseña/), 'P');

      expect(screen.getByText(/Fortaleza de la contraseña:/)).toBeInTheDocument();
    });

    it('advances to step 3 when email and password are valid', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);
      await goToStep3(user);

      expect(screen.getByLabelText(/^Teléfono/)).toBeInTheDocument();
      expect(screen.queryByLabelText(/^Email/)).not.toBeInTheDocument();
    });
  });

  // ─── 3. Step 3 — Verificación ────────────────────────────────────────────

  describe('Step 3 — Verificación', () => {
    it('renders optional fields and CAPTCHA', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);
      await goToStep3(user);

      expect(screen.getByLabelText(/^Teléfono/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Código de país del teléfono/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Cómo nos conociste/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Verificación CAPTCHA/)).toBeInTheDocument();
    });

    it('shows "Crear cuenta" button on step 3', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);
      await goToStep3(user);

      expect(screen.getByRole('button', { name: /^Crear cuenta$/ })).toBeInTheDocument();
    });
  });

  // ─── 4. Successful submission ──────────────────────────────────────────

  describe('Successful submission', () => {
    it('calls POST /auth/register with correct body and redirects to /dashboard on 201', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 201,
        json: async () => ({ accessToken: 'fake-token' }),
      });

      render(<RegisterForm />);
      await goToStep3(user);
      await user.click(screen.getByRole('button', { name: /^Crear cuenta$/ }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            companyName: 'Mi Empresa',
            email: 'test@empresa.com',
            password: 'Password1',
            country: 'CO',
            category: 'customer_support',
            size: '1',
          }),
        });
      });

      // Success animation appears immediately
      await waitFor(() => {
        expect(screen.getByText('¡Cuenta creada exitosamente!')).toBeInTheDocument();
      });

      // Redirect happens after the success animation (2s delay)
      await waitFor(
        () => {
          expect(pushMock).toHaveBeenCalledWith('/dashboard');
        },
        { timeout: 3000 },
      );
    });

    it('shows loading state while submitting', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(pendingPromise);

      render(<RegisterForm />);
      await goToStep3(user);
      await user.click(screen.getByRole('button', { name: /^Crear cuenta$/ }));

      expect(screen.getByText('Registrando...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Registrando/ })).toBeDisabled();

      resolvePromise!({ status: 201, json: async () => ({ accessToken: 'token' }) });
      await waitFor(() => expect(pushMock).toHaveBeenCalled(), { timeout: 3000 });
    });

    it('sends phone and phoneCountryCode only when phone is filled', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 201,
        json: async () => ({ accessToken: 'fake-token' }),
      });

      render(<RegisterForm />);
      await goToStep3(user);
      await user.type(screen.getByLabelText(/^Teléfono/), '3001234567');
      await user.click(screen.getByRole('button', { name: /^Crear cuenta$/ }));

      await waitFor(() => {
        const callBody = JSON.parse(
          (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
        );
        expect(callBody.phone).toBe('3001234567');
        expect(callBody.phoneCountryCode).toBe('+57');
      });
    });

    it('sends referralSource only when selected', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 201,
        json: async () => ({ accessToken: 'fake-token' }),
      });

      render(<RegisterForm />);
      await goToStep3(user);
      await user.selectOptions(screen.getByLabelText(/Cómo nos conociste/), 'google');
      await user.click(screen.getByRole('button', { name: /^Crear cuenta$/ }));

      await waitFor(() => {
        const callBody = JSON.parse(
          (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
        );
        expect(callBody.referralSource).toBe('google');
      });
    });
  });

  // ─── 5. Error handling ─────────────────────────────────────────────────

  describe('Error handling', () => {
    it('shows conflict message + login link on 409 and returns to step 2', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 409,
        json: async () => ({ error: 'Email ya registrado' }),
      });

      render(<RegisterForm />);
      await goToStep3(user);
      await user.click(screen.getByRole('button', { name: /^Crear cuenta$/ }));

      await waitFor(() => {
        expect(screen.getByText(/Ya existe una cuenta con este email\./)).toBeInTheDocument();
      });

      // Returned to step 2 (email visible)
      expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();

      const alert = screen.getByRole('alert');
      const loginLink = alert.querySelector('a[href="/login"]');
      expect(loginLink).toBeInTheDocument();
    });

    it('shows field-specific errors on 400 with fields object', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 400,
        json: async () => ({
          error: 'Datos inválidos',
          fields: { email: 'Email ya en uso' },
        }),
      });

      render(<RegisterForm />);
      await goToStep3(user);
      await user.click(screen.getByRole('button', { name: /^Crear cuenta$/ }));

      // To display email field error, navigate back to step 2
      await waitFor(() => {
        // We stay on step 3, but banner errors are server-side field errors visible when field is shown
        // so let's check the data is there via the state — we can re-navigate
      });
      // Navigate back to step 2 to see the email error
      await user.click(screen.getByRole('button', { name: /Atrás/ }));
      expect(screen.getByText('Email ya en uso')).toBeInTheDocument();
    });

    it('shows generic error on 400 without fields', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 400,
        json: async () => ({ message: 'Los datos enviados son inválidos. Revisa el formulario.' }),
      });

      render(<RegisterForm />);
      await goToStep3(user);
      await user.click(screen.getByRole('button', { name: /^Crear cuenta$/ }));

      await waitFor(() => {
        expect(
          screen.getByText('Los datos enviados son inválidos. Revisa el formulario.'),
        ).toBeInTheDocument();
      });
    });

    it('shows CAPTCHA error message on 403', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 403,
        json: async () => ({ error: 'CAPTCHA failed' }),
      });

      render(<RegisterForm />);
      await goToStep3(user);
      await user.click(screen.getByRole('button', { name: /^Crear cuenta$/ }));

      await waitFor(() => {
        expect(
          screen.getByText('El challenge de seguridad no fue superado. Intenta nuevamente.'),
        ).toBeInTheDocument();
      });
    });

    it('shows generic error message on 500', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      render(<RegisterForm />);
      await goToStep3(user);
      await user.click(screen.getByRole('button', { name: /^Crear cuenta$/ }));

      await waitFor(() => {
        expect(
          screen.getByText('Ocurrió un error inesperado. Por favor intenta más tarde.'),
        ).toBeInTheDocument();
      });
    });

    it('shows network error when fetch throws', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      render(<RegisterForm />);
      await goToStep3(user);
      await user.click(screen.getByRole('button', { name: /^Crear cuenta$/ }));

      await waitFor(() => {
        expect(
          screen.getByText('Error de conexión. Verifica tu red e intenta nuevamente.'),
        ).toBeInTheDocument();
      });
    });
  });

  // ─── 6. Responsive design ──────────────────────────────────────────────

  describe('Responsive design', () => {
    it('form uses full width with responsive spacing', () => {
      const { container } = render(<RegisterForm />);
      const form = container.querySelector('form');
      expect(form).toHaveClass('w-full');
      expect(form?.className).toMatch(/space-y-4/);
      expect(form?.className).toMatch(/sm:space-y-5/);
    });

    it('inputs have responsive padding', () => {
      render(<RegisterForm />);
      const companyInput = screen.getByLabelText(/Nombre de empresa/);
      expect(companyInput.className).toMatch(/px-3/);
      expect(companyInput.className).toMatch(/py-2\.5/);
      expect(companyInput.className).toMatch(/sm:px-4/);
      expect(companyInput.className).toMatch(/sm:py-3/);
    });

    it('step labels are hidden on mobile (sm:inline)', () => {
      const { container } = render(<RegisterForm />);
      const stepLabel = container.querySelector('[role="progressbar"] span');
      expect(stepLabel?.className).toMatch(/hidden/);
      expect(stepLabel?.className).toMatch(/sm:inline/);
    });

    it('input backgrounds use backdrop-blur for texture integration', () => {
      render(<RegisterForm />);
      const companyInput = screen.getByLabelText(/Nombre de empresa/);
      expect(companyInput.className).toMatch(/backdrop-blur-sm/);
    });

    it('company name input has autoComplete="organization"', () => {
      render(<RegisterForm />);
      const companyInput = screen.getByLabelText(/Nombre de empresa/);
      expect(companyInput).toHaveAttribute('autocomplete', 'organization');
    });
  });

  // ─── 7. Step indicator ────────────────────────────────────────────────

  describe('Step indicator', () => {
    it('updates aria-valuenow when advancing steps', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');

      await goToStep2(user);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');

      await fillStep2(user);
      await user.click(screen.getByRole('button', { name: /Siguiente/ }));
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
    });

    it('marks current step with aria-current="step"', async () => {
      const user = userEvent.setup();
      const { container } = render(<RegisterForm />);

      const step1Circle = container.querySelector('[aria-current="step"]');
      expect(step1Circle?.textContent).toContain('1');

      await goToStep2(user);
      const step2Circle = container.querySelector('[aria-current="step"]');
      expect(step2Circle?.textContent).toContain('2');
    });
  });
});
