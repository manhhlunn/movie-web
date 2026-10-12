'use client';

import { useEffect } from 'react';
import { initAutoSyncHistory } from '@/lib/userStore';

export default function HistoryAutoSync() {
  useEffect(() => {
    // Automatically connect to Supabase and pull latest history into client state
    initAutoSyncHistory();
  }, []);

  return null;
}
