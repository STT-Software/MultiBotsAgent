/**
 * Component tests for the Change Password feature.
 *
 * Covers:
 * 1. Initial render (3 empty fields, disabled button, requirements visible)
 * 2. Toggle visibility (eye icon toggles password/text)
 * 3. Real-time rule indicators (typing updates requirement indicators)
 * 4. Submit button state (disabled until all conditions met)
 * 5. Error messages by type (INVALID_CURRENT_PASSWORD, SAME_AS_CURRENT, match error)
 * 6. Toast success (role="status" after successful change)
 * 7. Toast error (role="alert" for network/server errors)
 * 8. Preserve values on error (form fields keep values on error)
 * 9. Clear on success (form fields cleared after success)
 * 10. Loading state (button shows spinner and is disabled during submit)
 * 11. ARIA accessibility (aria-invalid, aria-describedby, aria-live)
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 10.1, 10.2, 10.3, 10.4, 10.5
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChangePasswordContainer from '../ChangePasswordContainer';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock the changePassword service
const mockChangePassword = vi.fn();
vi.mock('../services', () => ({
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
}));

// Mock AuthStore
vi.mock('@/lib/auth', () => ({
  AuthStore: {
    getToken: vi.fn(() => 'mock-access-token'),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** A valid password that passes all rules. */
const VALID_PASSWORD = 'MyP@ss1!';

/** Fill all form fields with valid data to enable submit. */
async function fillFormValid(user: ReturnType<typeof userEvent.setup>) {
  const currentField = screen.getByLabelText('Contraseña actual');
  const newField = screen.getByLabelText('Nueva contraseña');
  const confirmField = screen.getByLabelText('Confirmar nueva contraseña');

  await user.type(currentField, 'OldPass1!');
  await user.type(newField, VALID_PASSWORD);
  await user.type(confirmField, VALID_PASSWORD);
}

/** Wait for debounce (300ms) to complete for match validation. */
async function waitForDebounce() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ChangePasswordContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ─── 1. Initial Render ───────────────────────────────────────────────────

  describe('1. Initial render', () => {
    it('shows 3 empty password fields', () => {
      render(<ChangePasswordContainer />);

      const currentField = screen.getByLabelText('Contraseña actual');
      const newField = screen.getByLabelText('Nueva contraseña');
      const confirmField = screen.getByLabelText('Confirmar nueva contraseña');

      expect(currentField).toHaveValue('');
      expect(newField).toHaveValue('');
      expect(confirmField).toHaveValue('');
    });

    it('shows submit button disabled initially', () => {
      render(<ChangePasswordContainer />);

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;
      expect(submitButton).toBeDisabled();
    });

    it('shows password requirements visible', () => {
      render(<ChangePasswordContainer />);

      expect(screen.getByText(/mínimo 8 caracteres/i)).toBeInTheDocument();
      expect(screen.getByText(/al menos una letra mayúscula/i)).toBeInTheDocument();
      expect(screen.getByText(/al menos una letra minúscula/i)).toBeInTheDocument();
      expect(screen.getByText(/al menos un número/i)).toBeInTheDocument();
      expect(screen.getByText(/al menos un carácter especial/i)).toBeInTheDocument();
    });

    it('renders all fields as type password by default', () => {
      render(<ChangePasswordContainer />);

      const currentField = screen.getByLabelText('Contraseña actual');
      const newField = screen.getByLabelText('Nueva contraseña');
      const confirmField = screen.getByLabelText('Confirmar nueva contraseña');

      expect(currentField).toHaveAttribute('type', 'password');
      expect(newField).toHaveAttribute('type', 'password');
      expect(confirmField).toHaveAttribute('type', 'password');
    });
  });

  // ─── 2. Toggle Visibility ────────────────────────────────────────────────

  describe('2. Toggle visibility', () => {
    it('clicking eye icon toggles between password and text type', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      const currentField = screen.getByLabelText('Contraseña actual');
      const toggleButtons = screen.getAllByRole('button', { name: /mostrar contraseña/i });

      // Initially password type
      expect(currentField).toHaveAttribute('type', 'password');

      // Click toggle → text
      await user.click(toggleButtons[0]);
      expect(currentField).toHaveAttribute('type', 'text');

      // Click again → password (now the label changed to "Ocultar")
      const hideButton = screen.getAllByRole('button', { name: /ocultar contraseña/i })[0];
      await user.click(hideButton);
      expect(currentField).toHaveAttribute('type', 'password');
    });

    it('each field has independent visibility toggle', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      const newField = screen.getByLabelText('Nueva contraseña');
      const toggleButtons = screen.getAllByRole('button', { name: /mostrar contraseña/i });

      // Toggle second field (new password)
      await user.click(toggleButtons[1]);

      // New password field should be text, others remain password
      expect(screen.getByLabelText('Contraseña actual')).toHaveAttribute('type', 'password');
      expect(newField).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText('Confirmar nueva contraseña')).toHaveAttribute('type', 'password');
    });
  });

  // ─── 3. Real-time Rule Indicators ───────────────────────────────────────

  describe('3. Real-time rule indicators', () => {
    it('typing in new password updates requirement indicators', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      const newField = screen.getByLabelText('Nueva contraseña');

      // Type a lowercase letter — lowercase rule should pass
      await user.type(newField, 'a');

      const lowercaseItem = screen.getByLabelText(/al menos una letra minúscula: cumplido/i);
      expect(lowercaseItem).toBeInTheDocument();

      // Uppercase should still not pass
      const uppercaseItem = screen.getByLabelText(/al menos una letra mayúscula: no cumplido/i);
      expect(uppercaseItem).toBeInTheDocument();
    });

    it('all rules pass when valid password is typed', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      const newField = screen.getByLabelText('Nueva contraseña');
      await user.type(newField, VALID_PASSWORD);

      // All rules should show as "cumplido"
      expect(screen.getByLabelText(/mínimo 8 caracteres: cumplido/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/al menos una letra mayúscula: cumplido/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/al menos una letra minúscula: cumplido/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/al menos un número: cumplido/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/al menos un carácter especial: cumplido/i)).toBeInTheDocument();
    });
  });

  // ─── 4. Submit Button State ──────────────────────────────────────────────

  describe('4. Submit button state', () => {
    it('remains disabled when only some fields are filled', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;
      const currentField = screen.getByLabelText('Contraseña actual');

      await user.type(currentField, 'something');
      expect(submitButton).toBeDisabled();
    });

    it('remains disabled when password rules are not met', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;
      const currentField = screen.getByLabelText('Contraseña actual');
      const newField = screen.getByLabelText('Nueva contraseña');
      const confirmField = screen.getByLabelText('Confirmar nueva contraseña');

      await user.type(currentField, 'OldPass1!');
      await user.type(newField, 'weak'); // doesn't meet rules
      await user.type(confirmField, 'weak');

      await waitForDebounce();

      expect(submitButton).toBeDisabled();
    });

    it('remains disabled when confirmation does not match', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;
      const currentField = screen.getByLabelText('Contraseña actual');
      const newField = screen.getByLabelText('Nueva contraseña');
      const confirmField = screen.getByLabelText('Confirmar nueva contraseña');

      await user.type(currentField, 'OldPass1!');
      await user.type(newField, VALID_PASSWORD);
      await user.type(confirmField, 'DifferentP@ss1!');

      await waitForDebounce();

      expect(submitButton).toBeDisabled();
    });

    it('becomes enabled when all conditions are met', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;

      await fillFormValid(user);
      await waitForDebounce();

      expect(submitButton).toBeEnabled();
    });
  });

  // ─── 5. Error Messages by Type ──────────────────────────────────────────

  describe('5. Error messages by type', () => {
    it('INVALID_CURRENT_PASSWORD shows error on current field', async () => {
      mockChangePassword.mockRejectedValueOnce({
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'La contraseña actual no es correcta.',
      });

      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      await fillFormValid(user);
      await waitForDebounce();

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('La contraseña actual no es correcta.')).toBeInTheDocument();
      });
    });

    it('SAME_AS_CURRENT shows error on new password field', async () => {
      mockChangePassword.mockRejectedValueOnce({
        code: 'SAME_AS_CURRENT',
        message: 'La nueva contraseña debe ser diferente a la actual.',
      });

      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      await fillFormValid(user);
      await waitForDebounce();

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('La nueva contraseña debe ser diferente a la actual.')).toBeInTheDocument();
      });
    });

    it('match error shows on confirm password field', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      const newField = screen.getByLabelText('Nueva contraseña');
      const confirmField = screen.getByLabelText('Confirmar nueva contraseña');

      await user.type(newField, VALID_PASSWORD);
      await user.type(confirmField, 'DifferentP@ss1!');

      await waitForDebounce();

      expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    });
  });

  // ─── 6. Toast Success ────────────────────────────────────────────────────

  describe('6. Toast success', () => {
    it('shows success toast with role="status" after successful change', async () => {
      mockChangePassword.mockResolvedValueOnce({
        success: true,
        message: 'Contraseña actualizada exitosamente',
      });

      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      await fillFormValid(user);
      await waitForDebounce();

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;
      await user.click(submitButton);

      await waitFor(() => {
        const toast = screen.getByRole('status');
        expect(toast).toBeInTheDocument();
        expect(toast).toHaveTextContent('Contraseña actualizada exitosamente');
      });
    });
  });

  // ─── 7. Toast Error ──────────────────────────────────────────────────────

  describe('7. Toast error', () => {
    it('shows error toast with role="alert" for network errors', async () => {
      mockChangePassword.mockRejectedValueOnce({
        code: 'NETWORK_ERROR',
        message: 'Sin conexión. Verifica tu conectividad.',
      });

      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      await fillFormValid(user);
      await waitForDebounce();

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;
      await user.click(submitButton);

      await waitFor(() => {
        const toast = screen.getByRole('alert');
        expect(toast).toBeInTheDocument();
        expect(toast).toHaveTextContent('Sin conexión. Verifica tu conectividad.');
      });
    });

    it('shows error toast with role="alert" for server errors', async () => {
      mockChangePassword.mockRejectedValueOnce({
        code: 'SERVER_ERROR',
        message: 'Error interno. Intenta más tarde.',
      });

      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      await fillFormValid(user);
      await waitForDebounce();

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;
      await user.click(submitButton);

      await waitFor(() => {
        const toast = screen.getByRole('alert');
        expect(toast).toBeInTheDocument();
        expect(toast).toHaveTextContent('Error interno. Intenta más tarde.');
      });
    });

    it('shows error toast with role="alert" for rate limit errors', async () => {
      mockChangePassword.mockRejectedValueOnce({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Demasiados intentos. Intenta en 15 minutos.',
      });

      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      await fillFormValid(user);
      await waitForDebounce();

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;
      await user.click(submitButton);

      await waitFor(() => {
        const toast = screen.getByRole('alert');
        expect(toast).toBeInTheDocument();
        expect(toast).toHaveTextContent('Demasiados intentos. Intenta en 15 minutos.');
      });
    });
  });

  // ─── 8. Preserve Values on Error ────────────────────────────────────────

  describe('8. Preserve values on error', () => {
    it('form fields keep their values when error occurs', async () => {
      mockChangePassword.mockRejectedValueOnce({
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'La contraseña actual no es correcta.',
      });

      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      await fillFormValid(user);
      await waitForDebounce();

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('La contraseña actual no es correcta.')).toBeInTheDocument();
      });

      // Fields should still have their values
      expect(screen.getByLabelText('Contraseña actual')).toHaveValue('OldPass1!');
      expect(screen.getByLabelText('Nueva contraseña')).toHaveValue(VALID_PASSWORD);
      expect(screen.getByLabelText('Confirmar nueva contraseña')).toHaveValue(VALID_PASSWORD);
    });
  });

  // ─── 9. Clear on Success ─────────────────────────────────────────────────

  describe('9. Clear on success', () => {
    it('form fields are cleared after successful change', async () => {
      mockChangePassword.mockResolvedValueOnce({
        success: true,
        message: 'Contraseña actualizada exitosamente',
      });

      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      await fillFormValid(user);
      await waitForDebounce();

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Fields should be cleared
      expect(screen.getByLabelText('Contraseña actual')).toHaveValue('');
      expect(screen.getByLabelText('Nueva contraseña')).toHaveValue('');
      expect(screen.getByLabelText('Confirmar nueva contraseña')).toHaveValue('');
    });
  });

  // ─── 10. Loading State ───────────────────────────────────────────────────

  describe('10. Loading state', () => {
    it('button shows loading text and is disabled during submit', async () => {
      // Create a promise that we control to keep the loading state active
      let resolvePromise!: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => { resolvePromise = resolve; });
      mockChangePassword.mockReturnValueOnce(pendingPromise);

      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      await fillFormValid(user);
      await waitForDebounce();

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;
      await user.click(submitButton);

      // During loading, button should be disabled and show loading text
      await waitFor(() => {
        expect(screen.getByText(/cambiando contraseña/i)).toBeInTheDocument();
      });

      const loadingButtons = screen.getAllByRole('button', { name: /cambiando contraseña/i });
      const loadingSubmit = loadingButtons.find((btn) => btn.getAttribute('type') === 'submit')!;
      expect(loadingSubmit).toBeDisabled();

      // Resolve the promise to clean up
      await act(async () => {
        resolvePromise({ success: true, message: 'ok' });
      });
    });

    it('form fields are disabled during loading', async () => {
      let resolvePromise!: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => { resolvePromise = resolve; });
      mockChangePassword.mockReturnValueOnce(pendingPromise);

      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      await fillFormValid(user);
      await waitForDebounce();

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Contraseña actual')).toBeDisabled();
        expect(screen.getByLabelText('Nueva contraseña')).toBeDisabled();
        expect(screen.getByLabelText('Confirmar nueva contraseña')).toBeDisabled();
      });

      // Resolve the promise to clean up
      await act(async () => {
        resolvePromise({ success: true, message: 'ok' });
      });
    });
  });

  // ─── 11. ARIA Accessibility ──────────────────────────────────────────────

  describe('11. ARIA accessibility', () => {
    it('aria-invalid is set on field with error', async () => {
      mockChangePassword.mockRejectedValueOnce({
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'La contraseña actual no es correcta.',
      });

      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      await fillFormValid(user);
      await waitForDebounce();

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;
      await user.click(submitButton);

      await waitFor(() => {
        const currentField = screen.getByLabelText('Contraseña actual');
        expect(currentField).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('aria-describedby references error message element', async () => {
      mockChangePassword.mockRejectedValueOnce({
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'La contraseña actual no es correcta.',
      });

      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      await fillFormValid(user);
      await waitForDebounce();

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;
      await user.click(submitButton);

      await waitFor(() => {
        const currentField = screen.getByLabelText('Contraseña actual');
        const describedBy = currentField.getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();

        // The referenced element should exist and contain the error message
        const errorElement = document.getElementById(describedBy!);
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent('La contraseña actual no es correcta.');
      });
    });

    it('aria-live is present on password requirements list', () => {
      render(<ChangePasswordContainer />);

      const requirementsList = screen.getByRole('list', { name: /requisitos de contraseña/i });
      expect(requirementsList).toHaveAttribute('aria-live', 'polite');
    });

    it('success toast has aria-live="polite"', async () => {
      mockChangePassword.mockResolvedValueOnce({
        success: true,
        message: 'Contraseña actualizada exitosamente',
      });

      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      await fillFormValid(user);
      await waitForDebounce();

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;
      await user.click(submitButton);

      await waitFor(() => {
        const toast = screen.getByRole('status');
        expect(toast).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('error toast has aria-live="assertive"', async () => {
      mockChangePassword.mockRejectedValueOnce({
        code: 'SERVER_ERROR',
        message: 'Error interno. Intenta más tarde.',
      });

      const user = userEvent.setup();
      render(<ChangePasswordContainer />);

      await fillFormValid(user);
      await waitForDebounce();

      const buttons = screen.getAllByRole('button', { name: /cambiar contraseña/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit')!;
      await user.click(submitButton);

      await waitFor(() => {
        const toast = screen.getByRole('alert');
        expect(toast).toHaveAttribute('aria-live', 'assertive');
      });
    });
  });
});
