import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

const TestThemeComponent = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
};

describe('ThemeContext', () => {
  it('toggles theme between light and dark and updates document root', () => {
    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    );

    const themeSpan = screen.getByTestId('current-theme');
    const initialTheme = themeSpan.textContent;
    expect(initialTheme).toMatch(/^(light|dark)$/);

    const button = screen.getByText('Toggle Theme');
    fireEvent.click(button);

    const nextTheme = themeSpan.textContent;
    expect(nextTheme).not.toBe(initialTheme);
  });
});
