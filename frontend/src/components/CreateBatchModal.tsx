import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UploadCloud, Image as ImageIcon, Trash2, Sparkles } from 'lucide-react';
import { apiClient } from '../api/client';
import { Button } from './common/Button';

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export const CreateBatchModal: React.FC<CreateBatchModalProps> = ({ isOpen, onClose, onCreated }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [batchName, setBatchName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (allowed.includes(file.type) || file.name.match(/\.(jpe?g|png|webp)$/i)) {
        validFiles.push(file);
      }
    }

    if (validFiles.length < files.length) {
      setError('Some files were skipped: Only JPG, PNG, and WEBP formats are supported.');
    } else {
      setError(null);
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = batchName.trim() || `Stock Batch ${new Date().toLocaleDateString()}`;

    if (selectedFiles.length === 0) {
      setError('Please select at least one image file.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const batch = await apiClient.createBatch(name);
      await apiClient.uploadImages(batch.id, selectedFiles);
      setBatchName('');
      setSelectedFiles([]);
      onClose();
      if (onCreated) onCreated();
      navigate(`/batches/${batch.id}`);
    } catch (err: any) {
      console.error('Failed to create batch:', err);
      setError(err.message || 'Failed to upload images and create batch');
    } finally {
      setIsUploading(false);
    }
  };

  const totalSizeMb = (selectedFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)]">
              <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)]">Create New Image Batch</h2>
              <p className="text-xs text-[var(--color-text-muted)]">Upload images for AI stock compliance and commercial metadata</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-sm text-[var(--color-error)] bg-[var(--color-error-bg)] border border-[var(--color-error)]/20 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text)] mb-1.5">
              Batch Name
            </label>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder={`e.g. Cyberpunk Cityscapes Q4 (Default: Stock Batch ${new Date().toLocaleDateString()})`}
              className="w-full px-3.5 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all text-sm"
              disabled={isUploading}
            />
          </div>

          {/* Drag & Drop Zone */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text)] mb-1.5">
              Select or Drop Images (JPEG, PNG, WEBP)
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150 ${
                isDragging
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)]/30'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary-accent)] bg-[var(--color-surface-secondary)]/50 hover:bg-[var(--color-surface-secondary)]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
                disabled={isUploading}
              />
              <div className="mx-auto w-12 h-12 mb-3 rounded-full bg-[var(--color-primary-container)] text-[var(--color-primary)] flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-[var(--color-text)]">
                Click to browse or drag and drop images here
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Batch capacity: 1 to 1,000 images per run
              </p>
            </div>
          </div>

          {/* Selected Files List Preview */}
          {selectedFiles.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-2">
                <span>Selected {selectedFiles.length} file(s) ({totalSizeMb} MB total)</span>
                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  className="text-[var(--color-error)] hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ImageIcon className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                      <span className="truncate text-[var(--color-text)] font-mono">{file.name}</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      disabled={isUploading}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-error)] p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
            <Button
              type="button"
              variant="tertiary"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isUploading || selectedFiles.length === 0}
              loading={isUploading}
              icon={<UploadCloud className="w-4 h-4" />}
            >
              {isUploading ? `Uploading ${selectedFiles.length} Images...` : 'Create Batch & Upload'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
