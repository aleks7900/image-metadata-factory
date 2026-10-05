import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Wand2,
  Layers,
  FolderKanban,
  Image as GalleryIcon,
  Tag,
  Maximize2,
  Server,
  Settings,
  Sparkles,
  Activity,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const navItems: NavItem[] = [
    {
      name: 'Generate',
      path: '/generate',
      icon: <Wand2 className="w-4 h-4" />,
    },
    {
      name: 'Bulk Generation',
      path: '/bulk',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      name: 'Batches',
      path: '/batches',
      icon: <FolderKanban className="w-4 h-4" />,
    },
    {
      name: 'Images / Gallery',
      path: '/gallery',
      icon: <GalleryIcon className="w-4 h-4" />,
    },
    {
      name: 'Metadata',
      path: '/metadata',
      icon: <Tag className="w-4 h-4" />,
    },
    {
      name: 'Upscaling',
      path: '/upscaling',
      icon: <Maximize2 className="w-4 h-4" />,
    },
    {
      name: 'Providers',
      path: '/providers',
      icon: <Server className="w-4 h-4" />,
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)] transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-[var(--color-border)]">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)] flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-[var(--color-text)]">
                Image Factory
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)]">
                v2.0
              </span>
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)] font-normal">
              Production Studio
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Workspace
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)] font-semibold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)] font-normal'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <span className="shrink-0">{item.icon}</span>
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Engine Telemetry Status */}
        <div className="p-3 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--color-surface-secondary)] text-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[var(--color-primary)] animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-[var(--color-text)]">
                  Vision Engine
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  Active & Ready
                </span>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
          </div>
        </div>
      </aside>
    </>
  );
};
