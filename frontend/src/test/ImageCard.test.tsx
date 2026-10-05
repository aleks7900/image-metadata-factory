import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageCard } from '../components/ImageCard';
import type { ImageJob } from '../types';

describe('ImageCard Component', () => {
  const mockImage: ImageJob = {
    id: 'img-123',
    batchId: 'batch-abc',
    originalFilename: 'cyberpunk_city.jpg',
    mimeType: 'image/jpeg',
    fileSizeBytes: 2048500,
    status: 'READY',
    title: 'Futuristic Neon City Street at Night',
    description: 'Vibrant cyberpunk metropolis with towering skyscrapers and bright neon signs.',
    riskStatus: 'SAFE',
    reviewDecision: 'APPROVED',
    retryCount: 0,
    processingDurationMs: 420,
    createdAt: '2026-10-05T10:00:00Z',
    updatedAt: '2026-10-05T10:01:00Z',
    keywords: ['cyberpunk', 'neon', 'cityscape', 'night'],
    safetyFindings: [],
  };

  it('renders filename, generated title, keyword count, and badges', () => {
    const onClick = vi.fn();
    const onApprove = vi.fn();
    const onReject = vi.fn();

    render(
      <ImageCard
        image={mockImage}
        onClick={onClick}
        onApprove={onApprove}
        onReject={onReject}
      />
    );

    expect(screen.getByText('cyberpunk_city.jpg')).toBeInTheDocument();
    expect(screen.getByText('Futuristic Neon City Street at Night')).toBeInTheDocument();
    expect(screen.getByText('4 kw')).toBeInTheDocument();
    expect(screen.getByText('SAFE')).toBeInTheDocument();
  });

  it('calls onClick handler when card is clicked', () => {
    const onClick = vi.fn();
    const onApprove = vi.fn();
    const onReject = vi.fn();

    render(
      <ImageCard
        image={mockImage}
        onClick={onClick}
        onApprove={onApprove}
        onReject={onReject}
      />
    );

    fireEvent.click(screen.getByText('cyberpunk_city.jpg'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
