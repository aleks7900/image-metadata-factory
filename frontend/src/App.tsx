import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { CreateBatchModal } from './components/CreateBatchModal';
import { BatchesPage } from './pages/BatchesPage';
import { BatchDetailsPage } from './pages/BatchDetailsPage';

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
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
          <Header onOpenCreateModal={() => setIsCreateModalOpen(true)} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<BatchesPage />} />
              <Route path="/batches" element={<BatchesPage />} />
              <Route path="/batches/:batchId" element={<BatchDetailsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                Image Metadata Factory • Built for high-volume commercial stock processing
              </div>
              <div className="flex items-center gap-4 text-slate-400">
                <span>Java 21 + Spring Boot 3</span>
                <span>•</span>
                <span>React + Vite</span>
                <span>•</span>
                <span>Multimodal Vision</span>
              </div>
            </div>
          </footer>

          <CreateBatchModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onCreated={() => queryClient.invalidateQueries({ queryKey: ['batches'] })}
          />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
