import { storage } from "./storage";

// E-paper sync service for periodic background sync
export class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // No global credentials needed - each user has their own
  }

  async fetchUserStatuses(exportUrl: string, exportKey: string): Promise<Record<string, any>> {
    if (!exportUrl || !exportKey) {
      throw new Error("E-paper export credentials not configured");
    }

    const url = `${exportUrl}/?export_key=${encodeURIComponent(exportKey)}&my_values=json`;
    
    const response = await fetch(url, { method: 'GET' });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch e-paper statuses: HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  }

  async performSync(): Promise<{ success: boolean; updatedCount: number; error?: string }> {
    // DISABLED: No longer syncing back from e-paper to dashboard
    // E-paper is now one-way only (dashboard -> e-paper)
    console.log("[Sync Service] Sync-back disabled - e-paper integration is one-way only");
    return { success: true, updatedCount: 0 };
  }

  start(): void {
    // DISABLED: No longer running periodic sync
    // E-paper verification is now done on-demand via /api/epaper/verify endpoint
    console.log("[Sync Service] Periodic sync disabled - use /api/epaper/verify for verification");
  }

  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log("[Sync Service] Stopped");
    }
  }
}

export const syncService = new SyncService();
