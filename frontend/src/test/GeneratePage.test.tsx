import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { GeneratePage } from '../pages/GeneratePage';

describe('GeneratePage Component', () => {
  it('renders generation form and handles prompt editing and stepper', () => {
    render(
      <BrowserRouter>
        <GeneratePage />
      </BrowserRouter>
    );

    expect(screen.getByText('Generate Image')).toBeInTheDocument();
    expect(screen.getByText(/Create production-ready AI images/i)).toBeInTheDocument();

    const generateBtn = screen.getByRole('button', { name: /generate images/i });
    expect(generateBtn).toBeInTheDocument();

    // Check prompt textarea
    const textarea = screen.getByPlaceholderText(/describe the image you want to generate/i);
    expect(textarea).toBeInTheDocument();

    // Change prompt
    fireEvent.change(textarea, { target: { value: 'A golden retriever in a field of sunflowers' } });
    expect(textarea).toHaveValue('A golden retriever in a field of sunflowers');

    // Stepper buttons
    const minusBtn = screen.getByText('−');
    const plusBtn = screen.getByText('+');
    const stepperVal = screen.getByTestId('num-images-value');

    expect(stepperVal).toHaveTextContent('4');
    fireEvent.click(plusBtn);
    expect(stepperVal).toHaveTextContent('5');
    fireEvent.click(minusBtn);
    expect(stepperVal).toHaveTextContent('4');
  });
});
