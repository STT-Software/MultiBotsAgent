import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import AuthLayout from './layout';

afterEach(() => {
  cleanup();
});

describe('AuthLayout (responsive)', () => {
  it('renders child content', () => {
    const { getByText } = render(
      <AuthLayout>
        <div>child content</div>
      </AuthLayout>,
    );
    expect(getByText('child content')).toBeInTheDocument();
  });

  it('uses a 1-column grid on mobile and 2-column on lg+', () => {
    const { container } = render(
      <AuthLayout>
        <div />
      </AuthLayout>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/grid-cols-1/);
    expect(root.className).toMatch(/lg:grid-cols-\[/);
  });

  it('marketing aside is hidden below lg and visible at lg+', () => {
    const { container } = render(
      <AuthLayout>
        <div />
      </AuthLayout>,
    );
    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside?.className).toMatch(/hidden/);
    expect(aside?.className).toMatch(/lg:flex/);
  });

  it('top brand strip is visible on mobile and hidden at lg+', () => {
    const { container } = render(
      <AuthLayout>
        <div />
      </AuthLayout>,
    );
    const header = container.querySelector('header');
    expect(header).not.toBeNull();
    expect(header?.className).toMatch(/lg:hidden/);
  });

  it('main content area has responsive padding', () => {
    const { container } = render(
      <AuthLayout>
        <div />
      </AuthLayout>,
    );
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
    // px-4 base, sm:px-6, lg:px-8, xl:px-12
    expect(main?.className).toMatch(/px-4/);
    expect(main?.className).toMatch(/sm:px-6/);
    expect(main?.className).toMatch(/lg:px-8/);
    expect(main?.className).toMatch(/xl:px-12/);
  });

  it('main content has a max-width container for readability', () => {
    const { container } = render(
      <AuthLayout>
        <div />
      </AuthLayout>,
    );
    const formWrapper = container.querySelector('main > div');
    expect(formWrapper?.className).toMatch(/max-w-\[480px\]/);
    expect(formWrapper?.className).toMatch(/w-full/);
  });

  it('aside has responsive horizontal padding (px-8 → xl:px-12 → 2xl:px-16)', () => {
    const { container } = render(
      <AuthLayout>
        <div />
      </AuthLayout>,
    );
    const aside = container.querySelector('aside');
    expect(aside?.className).toMatch(/px-8/);
    expect(aside?.className).toMatch(/xl:px-12/);
    expect(aside?.className).toMatch(/2xl:px-16/);
  });

  it('marketing aside has a background video element', () => {
    const { container } = render(
      <AuthLayout>
        <div />
      </AuthLayout>,
    );
    const video = container.querySelector('aside video');
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('autoplay');
    expect(video).toHaveAttribute('loop');
    expect(video?.className).toMatch(/opacity-60/);
  });
});
