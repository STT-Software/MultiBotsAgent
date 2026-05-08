import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LoginForm } from '../components';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/auth', () => ({
  AuthStore: {
    setToken: vi.fn(),
    getToken: vi.fn(() => null),
    clearToken: vi.fn(),
  },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LoginForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ─── 1. Rendering ────────────────────────────────────────────────────────

  it('renders the login form with email and password fields', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/)).toBeInTheDocument();
  });

  // ─── 2–4. Validation errors on blur ──────────────────────────────────────

  it('shows validation error when email is empty on blur', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/^Email/);
    await user.click(emailInput);
    await user.tab();

    expect(screen.getByText('El email es obligatorio')).toBeInTheDocument();
  });

  it('shows validation error when email format is invalid on blur', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/^Email/);
    await user.type(emailInput, 'invalid-email');
    await user.tab();

    expect(screen.getByText('Formato de email inválido')).toBeInTheDocument();
  });

  it('shows validation error when password is empty on blur', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText(/Contraseña/);
    await user.click(passwordInput);
    await user.tab();

    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument();
  });

  // ─── 5–6. Submit button states ───────────────────────────────────────────

  it('submit button shows "Iniciar sesión" text', () => {
    render(<LoginForm />);

    expect(
      screen.getByRole('button', { name: /Iniciar sesión/ }),
    ).toBeInTheDocument();
  });

  it('submit button shows loading spinner during submission', async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(pendingPromise);

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/^Email/), 'test@empresa.com');
    await user.type(screen.getByLabelText(/Contraseña/), 'Password1');
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/ }));

    expect(screen.getByText('Iniciando sesión...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciando sesión/ })).toBeDisabled();

    // Cleanup: resolve the pending promise
    resolvePromise!({ status: 200, json: async () => ({ accessToken: 'token' }) });
    await waitFor(() => expect(screen.getByText('¡Sesión iniciada!')).toBeInTheDocument(), {
      timeout: 3000,
    });
  });

  // ─── 7. Toggle show/hide password ────────────────────────────────────────

  it('toggle show/hide password works (changes input type)', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText(/Contraseña/) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleButton = screen.getByRole('button', { name: /Mostrar contraseña/ });
    await user.click(toggleButton);

    expect(passwordInput.type).toBe('text');

    const hideButton = screen.getByRole('button', { name: /Ocultar contraseña/ });
    await user.click(hideButton);

    expect(passwordInput.type).toBe('password');
  });

  // ─── 8. Error: INVALID_CREDENTIALS (401) ─────────────────────────────────

  it('displays error banner for INVALID_CREDENTIALS (401 response)', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: 401,
      json: async () => ({
        error: { code: 'INVALID_CREDENTIALS', message: 'Email o contraseña incorrectos' },
      }),
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/^Email/), 'test@empresa.com');
    await user.type(screen.getByLabelText(/Contraseña/), 'WrongPass1');
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/ }));

    await waitFor(() => {
      expect(screen.getByText('Email o contraseña incorrectos')).toBeInTheDocument();
    });
  });

  // ─── 9. Error: RATE_LIMIT_EXCEEDED (429) ──────────────────────────────────

  it('displays error banner with countdown for RATE_LIMIT_EXCEEDED (429 response)', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: 429,
      headers: new Headers({ 'Retry-After': '30' }),
      json: async () => ({
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Demasiados intentos.' },
      }),
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/^Email/), 'test@empresa.com');
    await user.type(screen.getByLabelText(/Contraseña/), 'Password1');
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/ }));

    await waitFor(() => {
      expect(screen.getByText(/Demasiados intentos/)).toBeInTheDocument();
      expect(screen.getByText(/30s/)).toBeInTheDocument();
    });
  });

  // ─── 10. Error: COMPANY_PENDING_DELETION (403) ────────────────────────────

  it('displays yellow warning banner for COMPANY_PENDING_DELETION (403 response)', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: 403,
      json: async () => ({
        error: {
          code: 'COMPANY_PENDING_DELETION',
          message: 'Tu cuenta está programada para eliminación',
          deletionDate: '2025-03-01T00:00:00.000Z',
        },
      }),
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/^Email/), 'test@empresa.com');
    await user.type(screen.getByLabelText(/Contraseña/), 'Password1');
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/ }));

    await waitFor(() => {
      expect(
        screen.getByText(/Tu cuenta está programada para eliminación/),
      ).toBeInTheDocument();
    });

    // Verify it's a yellow/warning banner (border-yellow)
    const alert = screen.getByRole('alert');
    expect(alert.className).toMatch(/border-yellow/);
  });

  // ─── 11. Success animation ────────────────────────────────────────────────

  it('shows success animation on successful login (200 response)', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: 200,
      json: async () => ({ accessToken: 'fake-token' }),
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/^Email/), 'test@empresa.com');
    await user.type(screen.getByLabelText(/Contraseña/), 'Password1');
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/ }));

    await waitFor(() => {
      expect(screen.getByText('¡Sesión iniciada!')).toBeInTheDocument();
    });

    // Redirect happens after 2s delay
    await waitFor(
      () => {
        expect(pushMock).toHaveBeenCalledWith('/dashboard');
      },
      { timeout: 3000 },
    );
  });

  // ─── 12. Accessibility: aria-required ─────────────────────────────────────

  it('accessibility: inputs have aria-required="true"', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(/Contraseña/)).toHaveAttribute('aria-required', 'true');
  });

  // ─── 13. Accessibility: error banners have role="alert" ───────────────────

  it('accessibility: error banners have role="alert"', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: 401,
      json: async () => ({
        error: { code: 'INVALID_CREDENTIALS', message: 'Email o contraseña incorrectos' },
      }),
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/^Email/), 'test@empresa.com');
    await user.type(screen.getByLabelText(/Contraseña/), 'WrongPass1');
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/ }));

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  // ─── 14. Register link ────────────────────────────────────────────────────

  it('shows "¿No tienes cuenta? Crear cuenta" link pointing to /register', () => {
    render(<LoginForm />);

    const link = screen.getByRole('link', { name: /Crear cuenta/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/register');
    expect(screen.getByText(/¿No tienes cuenta\?/)).toBeInTheDocument();
  });

  // ─── 15. Network error ────────────────────────────────────────────────────

  it('error de red shows connection error message', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Network error'),
    );

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/^Email/), 'test@empresa.com');
    await user.type(screen.getByLabelText(/Contraseña/), 'Password1');
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/ }));

    await waitFor(() => {
      expect(
        screen.getByText('Error de conexión. Verifica tu red e intenta nuevamente.'),
      ).toBeInTheDocument();
    });
  });
});
