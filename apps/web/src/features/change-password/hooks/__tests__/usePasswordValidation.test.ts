import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePasswordValidation } from '../usePasswordValidation';

describe('usePasswordValidation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Real-time rule validation ─────────────────────────────────────────────

  it('returns validation result with 6 rules for any password', () => {
    const { result } = renderHook(() =>
      usePasswordValidation({ newPassword: '', confirmPassword: '' }),
    );

    expect(result.current.validationResult.rules).toHaveLength(6);
    expect(result.current.validationResult.isValid).toBe(false);
  });

  it('validates password rules in real-time on newPassword change', () => {
    const { result, rerender } = renderHook(
      (props) => usePasswordValidation(props),
      { initialProps: { newPassword: '', confirmPassword: '' } },
    );

    // Initially all rules fail (except MAX_LENGTH)
    expect(result.current.validationResult.isValid).toBe(false);

    // Valid password
    rerender({ newPassword: 'MyP@ss1!', confirmPassword: '' });
    expect(result.current.validationResult.isValid).toBe(true);
  });

  it('updates individual rule results correctly', () => {
    const { result, rerender } = renderHook(
      (props) => usePasswordValidation(props),
      { initialProps: { newPassword: 'abc', confirmPassword: '' } },
    );

    const findRule = (rule: string) =>
      result.current.validationResult.rules.find((r) => r.rule === rule);

    // 'abc' - lowercase passes, others fail
    expect(findRule('LOWERCASE')?.passed).toBe(true);
    expect(findRule('UPPERCASE')?.passed).toBe(false);
    expect(findRule('DIGIT')?.passed).toBe(false);
    expect(findRule('SPECIAL_CHAR')?.passed).toBe(false);
    expect(findRule('MIN_LENGTH')?.passed).toBe(false);
    expect(findRule('MAX_LENGTH')?.passed).toBe(true);

    // Add uppercase
    rerender({ newPassword: 'Abc', confirmPassword: '' });
    expect(findRule('UPPERCASE')?.passed).toBe(true);
    expect(findRule('LOWERCASE')?.passed).toBe(true);
  });

  // ─── Match validation with debounce ────────────────────────────────────────

  it('returns isMatch as null when confirmPassword is empty', () => {
    const { result } = renderHook(() =>
      usePasswordValidation({ newPassword: 'MyP@ss1!', confirmPassword: '' }),
    );

    expect(result.current.isMatch).toBeNull();
    expect(result.current.matchError).toBeNull();
  });

  it('debounces match validation by 300ms', () => {
    const { result, rerender } = renderHook(
      (props) => usePasswordValidation(props),
      { initialProps: { newPassword: 'MyP@ss1!', confirmPassword: '' } },
    );

    // Type in confirmation
    rerender({ newPassword: 'MyP@ss1!', confirmPassword: 'MyP@ss1!' });

    // Before debounce fires, isMatch should still be null (first interaction)
    // Actually after rerender with non-empty confirm, hasInteracted becomes true
    // but the timer hasn't fired yet
    expect(result.current.isMatch).toBeNull();

    // Advance timer by 300ms
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isMatch).toBe(true);
    expect(result.current.matchError).toBeNull();
  });

  it('shows matchError when passwords do not match after debounce', () => {
    const { result, rerender } = renderHook(
      (props) => usePasswordValidation(props),
      { initialProps: { newPassword: 'MyP@ss1!', confirmPassword: '' } },
    );

    rerender({ newPassword: 'MyP@ss1!', confirmPassword: 'Different1!' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isMatch).toBe(false);
    expect(result.current.matchError).toBe('Las contraseñas no coinciden');
  });

  it('re-validates match when newPassword changes and confirmPassword is not empty', () => {
    const { result, rerender } = renderHook(
      (props) => usePasswordValidation(props),
      { initialProps: { newPassword: 'MyP@ss1!', confirmPassword: 'MyP@ss1!' } },
    );

    // Let debounce fire
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.isMatch).toBe(true);

    // Change newPassword so it no longer matches
    rerender({ newPassword: 'NewP@ss2!', confirmPassword: 'MyP@ss1!' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isMatch).toBe(false);
    expect(result.current.matchError).toBe('Las contraseñas no coinciden');
  });

  it('clears matchError when passwords match again after debounce', () => {
    const { result, rerender } = renderHook(
      (props) => usePasswordValidation(props),
      { initialProps: { newPassword: 'MyP@ss1!', confirmPassword: 'Wrong' } },
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.isMatch).toBe(false);

    // Fix confirmation
    rerender({ newPassword: 'MyP@ss1!', confirmPassword: 'MyP@ss1!' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isMatch).toBe(true);
    expect(result.current.matchError).toBeNull();
  });

  it('does not show mismatch error if confirmPassword has not been interacted with', () => {
    const { result } = renderHook(() =>
      usePasswordValidation({ newPassword: 'MyP@ss1!', confirmPassword: '' }),
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isMatch).toBeNull();
    expect(result.current.matchError).toBeNull();
  });
});
