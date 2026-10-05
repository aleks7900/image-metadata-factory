import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportModal } from '../components/ExportModal';

describe('ExportModal Component', () => {
  it('renders modal with options and triggers download when clicked', () => {
    const onClose = vi.fn();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <ExportModal
        isOpen={true}
        batchId="batch-123"
        batchName="Stock Autumn Batch"
        onClose={onClose}
      />
    );

    expect(screen.getByText('Export Batch to CSV')).toBeInTheDocument();
    expect(screen.getByText('Safe & Approved Only')).toBeInTheDocument();
    expect(screen.getByText('Download CSV')).toBeInTheDocument();

    // Click download
    fireEvent.click(screen.getByText('Download CSV'));

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/batches/batch-123/export.csv?policy=SAFE_AND_APPROVED&format=STANDARD'),
      '_blank'
    );
    expect(onClose).toHaveBeenCalledTimes(1);

    openSpy.mockRestore();
  });
});
