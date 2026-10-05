import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { BulkGenerationPage } from '../pages/BulkGenerationPage';

describe('BulkGenerationPage Component', () => {
  it('advances through workflow steps from Input to Configuration', () => {
    render(
      <BrowserRouter>
        <BulkGenerationPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Bulk Generation')).toBeInTheDocument();
    expect(screen.getByText('1. Prompts Input')).toBeInTheDocument();

    const continueBtn = screen.getByRole('button', { name: /continue to configuration/i });
    expect(continueBtn).toBeInTheDocument();

    fireEvent.click(continueBtn);
    expect(screen.getByText('2. Batch & Generation Settings')).toBeInTheDocument();
  });
});
