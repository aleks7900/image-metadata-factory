import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface AppShellProps {
  children: React.ReactNode;
  onOpenCreateBatch: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, onOpenCreateBatch }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Sidebar */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-200">
        <TopBar
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenCreateBatch={onOpenCreateBatch}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <footer className="border-t border-[var(--color-border)] py-4 px-6 text-xs text-[var(--color-text-muted)] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Image Factory • Material Design 3 Edition</span>
          <div className="flex items-center gap-3">
            <span>Spring Boot 3 + Java 21</span>
            <span>•</span>
            <span>React 19 + Vite</span>
            <span>•</span>
            <span>Green Brand Identity</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
