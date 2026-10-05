import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { BatchProgressEvent } from '../types';

export function useBatchSse(batchId: string | undefined, isProcessing: boolean) {
  const queryClient = useQueryClient();
  const [latestEvent, setLatestEvent] = useState<BatchProgressEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!batchId) return;

    let eventSource: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      eventSource = new EventSource(`/api/v1/batches/${batchId}/events`);

      eventSource.addEventListener('CONNECTED', () => {
        setIsConnected(true);
      });

      eventSource.addEventListener('BATCH_PROGRESS', (event: MessageEvent) => {
        try {
          const data: BatchProgressEvent = JSON.parse(event.data);
          setLatestEvent(data);

          // Invalidate relevant React Query caches to re-render smoothly
          queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
          queryClient.invalidateQueries({ queryKey: ['batch-images', batchId] });
        } catch (e) {
          console.error('Error parsing SSE event data:', e);
        }
      });

      eventSource.onerror = () => {
        setIsConnected(false);
        if (eventSource) {
          eventSource.close();
        }
        // Attempt reconnection after 3 seconds if batch is still active
        if (isProcessing) {
          retryTimeout = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearTimeout(retryTimeout);
    };
  }, [batchId, isProcessing, queryClient]);

  return { latestEvent, isConnected };
}
