import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Sun, Moon, Plus, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../common/Button';

interface TopBarProps {
  onOpenMobileMenu: () => void;
  onOpenCreateBatch: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenMobileMenu,
  onOpenCreateBatch,
}) => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const getPageTitle = (pathname: string): { title: string; subtitle: string } => {
    if (pathname === '/generate') {
      return { title: 'Generate Image', subtitle: 'Create production-ready AI images' };
    }
    if (pathname === '/bulk') {
      return { title: 'Bulk Generation', subtitle: 'High-throughput prompt & batch processing' };
    }
    if (pathname.startsWith('/batches/')) {
      return { title: 'Batch Details', subtitle: 'Inspect, monitor, and export batch jobs' };
    }
    if (pathname === '/batches' || pathname === '/') {
      return { title: 'Batches', subtitle: 'Commercial stock automation & batch runs' };
    }
    if (pathname === '/gallery') {
      return { title: 'Image Gallery', subtitle: 'Browse, filter, and inspect processed assets' };
    }
    if (pathname === '/metadata') {
      return { title: 'Metadata Pipeline', subtitle: 'Stock title, description, keywords & safety review' };
    }
    if (pathname === '/upscaling') {
      return { title: 'Image Upscaling', subtitle: 'AI super-resolution up to 8x with CUDA acceleration' };
    }
    if (pathname === '/providers') {
      return { title: 'AI Providers', subtitle: 'Model orchestration & API credentials' };
    }
    if (pathname === '/settings') {
      return { title: 'Settings', subtitle: 'Preferences, defaults, and stock compliance policies' };
    }
    return { title: 'Image Factory', subtitle: 'AI Commercial Image Production' };
  };

  const { title, subtitle } = getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-30 h-16 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 sm:px-6 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)] lg:hidden cursor-pointer"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-[var(--color-text)] leading-tight">
            {title}
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] hidden sm:block">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* System online indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-surface-secondary)] text-xs text-[var(--color-text-muted)]">
          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" />
          <span>PostgreSQL & Spring Boot Online</span>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)] transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Primary Action Button */}
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenCreateBatch}
          icon={<Plus className="w-4 h-4" />}
        >
          New Batch
        </Button>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)] flex items-center justify-center font-bold text-xs ring-1 ring-[var(--color-border)] select-none">
          IF
        </div>
      </div>
    </header>
  );
};
