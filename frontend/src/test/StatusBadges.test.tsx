import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JobStatusBadge, RiskBadge, BatchStatusBadge } from '../components/StatusBadges';

describe('StatusBadges Components', () => {
  it('renders JobStatusBadge correctly for READY status', () => {
    render(<JobStatusBadge status="READY" />);
    expect(screen.getByText(/Ready/i)).toBeInTheDocument();
  });

  it('renders JobStatusBadge correctly for FAILED status', () => {
    render(<JobStatusBadge status="FAILED" />);
    expect(screen.getByText(/Failed/i)).toBeInTheDocument();
  });

  it('renders RiskBadge correctly for SAFE', () => {
    render(<RiskBadge risk="SAFE" />);
    expect(screen.getByText('SAFE')).toBeInTheDocument();
  });

  it('renders RiskBadge correctly for REVIEW_REQUIRED', () => {
    render(<RiskBadge risk="REVIEW_REQUIRED" />);
    expect(screen.getByText('REVIEW REQUIRED')).toBeInTheDocument();
  });

  it('renders RiskBadge correctly for REJECT', () => {
    render(<RiskBadge risk="REJECT" />);
    expect(screen.getByText('REJECT')).toBeInTheDocument();
  });

  it('renders BatchStatusBadge for PROCESSING and COMPLETED', () => {
    const { rerender } = render(<BatchStatusBadge status="PROCESSING" />);
    expect(screen.getByText(/Processing/i)).toBeInTheDocument();

    rerender(<BatchStatusBadge status="COMPLETED" />);
    expect(screen.getByText(/Completed/i)).toBeInTheDocument();
  });
});
