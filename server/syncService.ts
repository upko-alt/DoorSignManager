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
    try {
      console.log("[Sync Service] Starting periodic sync...");
      
      let updatedCount = 0;
      const users = await storage.getAllUsers();
      
      // Sync each user that has e-paper configuration
      for (const user of users) {
        // Skip users without e-paper configuration
        if (!user.epaperExportUrl || !user.epaperApiKey || !user.epaperId) {
          console.log(`[Sync Service] Skipping user ${user.username} - no e-paper config`);
          continue;
        }
        
        try {
          const statuses = await this.fetchUserStatuses(user.epaperExportUrl, user.epaperApiKey);
          
          // Look for status key using epaperId
          const statusKey = `${user.epaperId}_status`;
          
          if (statuses[statusKey] && statuses[statusKey] !== user.currentStatus) {
            await storage.updateUserStatus(user.id, statuses[statusKey]);
            updatedCount++;
            console.log(`[Sync Service] Updated ${user.username} (${user.epaperId}): ${user.currentStatus} -> ${statuses[statusKey]}`);
          }
        } catch (userError) {
          console.error(`[Sync Service] Failed to sync user ${user.username}:`, userError instanceof Error ? userError.message : "Unknown error");
          // Continue with other users even if one fails
        }
      }
      
      // Record sync status
      await storage.createSyncStatus({
        success: "true",
        errorMessage: null,
        updatedCount: updatedCount.toString(),
      });
      
      console.log(`[Sync Service] Sync completed. Updated ${updatedCount} user(s).`);
      
      return { success: true, updatedCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Sync Service] Sync failed:", errorMessage);
      
      // Record failed sync
      await storage.createSyncStatus({
        success: "false",
        errorMessage,
        updatedCount: "0",
      });
      
      return { success: false, updatedCount: 0, error: errorMessage };
    }
  }

  start(): void {
    if (this.syncInterval) {
      console.warn("[Sync Service] Already running");
      return;
    }

    console.log(`[Sync Service] Starting periodic sync every ${this.SYNC_INTERVAL_MS / 1000 / 60} minutes`);
    
    // Perform initial sync
    this.performSync();
    
    // Schedule periodic sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, this.SYNC_INTERVAL_MS);
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
