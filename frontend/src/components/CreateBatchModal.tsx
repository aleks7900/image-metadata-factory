import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UploadCloud, Image as ImageIcon, Trash2, Sparkles, FolderArchive, FolderOpen } from 'lucide-react';
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
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [batchName, setBatchName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/zip', 'application/x-zip-compressed'];
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (allowed.includes(file.type) || file.name.match(/\.(jpe?g|png|webp|zip)$/i)) {
        validFiles.push(file);
      }
    }

    if (validFiles.length < files.length) {
      setError('Some files were skipped: Only JPG, PNG, WEBP, and ZIP formats are supported.');
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
      setError('Please select at least one image file or a ZIP archive.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)]">
              <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)]">Create New Stock Image Batch</h2>
              <p className="text-xs text-[var(--color-text-muted)]">Upload images, folders, or ZIP archives for Adobe Stock processing</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
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
              placeholder={`e.g. Adobe Stock Autumn 2026 Collection (Default: Stock Batch ${new Date().toLocaleDateString()})`}
              className="w-full px-3.5 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all text-sm"
              disabled={isUploading}
            />
          </div>

          {/* Drag & Drop Zone */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]">
                Select or Drop Files (JPEG, PNG, WEBP, ZIP)
              </label>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Select Entire Folder
              </button>
            </div>

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
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/zip,.zip"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
                disabled={isUploading}
              />
              {/* Hidden directory input */}
              <input
                ref={folderInputRef}
                type="file"
                multiple
                {...({ webkitdirectory: '', directory: '' } as any)}
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
                disabled={isUploading}
              />

              <div className="mx-auto w-12 h-12 mb-3 rounded-full bg-[var(--color-primary-container)] text-[var(--color-primary)] flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-[var(--color-text)]">
                Click to browse images or drop files / ZIP archives here
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Supports batches from 100 to 1,000+ images with automatic ZIP decompression
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
                      {file.name.toLowerCase().endsWith('.zip') ? (
                        <FolderArchive className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                      )}
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
              {isUploading ? `Uploading ${selectedFiles.length} Files...` : 'Create Batch & Upload'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
