import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { AppShell } from './components/layout/AppShell';
import { CreateBatchModal } from './components/CreateBatchModal';

import { BatchesPage } from './pages/BatchesPage';
import { BatchDetailsPage } from './pages/BatchDetailsPage';
import { GeneratePage } from './pages/GeneratePage';
import { BulkGenerationPage } from './pages/BulkGenerationPage';
import { GalleryPage } from './pages/GalleryPage';
import { MetadataPage } from './pages/MetadataPage';
import { UpscalingPage } from './pages/UpscalingPage';
import { ProvidersPage } from './pages/ProvidersPage';
import { SettingsPage } from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3000,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AppShell onOpenCreateBatch={() => setIsCreateModalOpen(true)}>
            <Routes>
              {/* Preserved Core Routes */}
              <Route path="/" element={<BatchesPage />} />
              <Route path="/batches" element={<BatchesPage />} />
              <Route path="/batches/:batchId" element={<BatchDetailsPage />} />

              {/* Redesigned Workflow Screens */}
              <Route path="/generate" element={<GeneratePage />} />
              <Route path="/bulk" element={<BulkGenerationPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/metadata" element={<MetadataPage />} />
              <Route path="/upscaling" element={<UpscalingPage />} />
              <Route path="/providers" element={<ProvidersPage />} />
              <Route path="/settings" element={<SettingsPage />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/batches" replace />} />
            </Routes>
          </AppShell>

          <CreateBatchModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onCreated={() => queryClient.invalidateQueries({ queryKey: ['batches'] })}
          />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
