import { storage } from "./storage";

// E-paper sync service for periodic background sync
export class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private exportUrl: string;
  private exportKey: string;

  constructor() {
    this.exportUrl = process.env.EPAPER_EXPORT_URL || "";
    this.exportKey = process.env.EPAPER_EXPORT_KEY || "";
  }

  async fetchCurrentStatuses(): Promise<Record<string, any>> {
    if (!this.exportUrl || !this.exportKey) {
      console.warn("E-paper export credentials not configured. Skipping external fetch.");
      return {};
    }

    try {
      const url = `${this.exportUrl}/?export_key=${encodeURIComponent(this.exportKey)}&my_values=json`;
      
      const response = await fetch(url, { method: 'GET' });
      
      if (!response.ok) {
        console.error(`Failed to fetch e-paper statuses: ${response.status}`);
        return {};
      }
      
      const data = await response.json();
      console.log("Fetched e-paper statuses:", data);
      return data;
    } catch (error) {
      console.error("Error fetching e-paper statuses:", error);
      return {};
    }
  }

  async performSync(): Promise<{ success: boolean; updatedCount: number; error?: string }> {
    try {
      console.log("[Sync Service] Starting periodic sync...");
      
      const statuses = await this.fetchCurrentStatuses();
      
      // Update member statuses from e-paper data
      let updatedCount = 0;
      const members = await storage.getMembers();
      
      for (const member of members) {
        if (!member.email) continue;
        
        const sanitizedEmail = member.email.replace(/[@.]/g, "_");
        const statusKey = `${sanitizedEmail}_status`;
        
        if (statuses[statusKey] && statuses[statusKey] !== member.currentStatus) {
          await storage.updateMemberStatus(member.id, statuses[statusKey]);
          updatedCount++;
          console.log(`[Sync Service] Updated ${member.name}: ${member.currentStatus} -> ${statuses[statusKey]}`);
        }
      }
      
      // Record sync status
      await storage.createSyncStatus({
        success: "true",
        errorMessage: null,
        updatedCount: updatedCount.toString(),
      });
      
      console.log(`[Sync Service] Sync completed. Updated ${updatedCount} member(s).`);
      
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
