import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { updateStatusSchema } from "@shared/schema";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { z } from "zod";

// E-paper API service
class EpaperService {
  private importUrl: string;
  private exportUrl: string;
  private importKey: string;
  private exportKey: string;

  constructor() {
    this.importUrl = process.env.EPAPER_IMPORT_URL || "";
    this.exportUrl = process.env.EPAPER_EXPORT_URL || "";
    this.importKey = process.env.EPAPER_IMPORT_KEY || "";
    this.exportKey = process.env.EPAPER_EXPORT_KEY || "";
  }

  async sendStatusUpdate(memberEmail: string, status: string, customText?: string): Promise<void> {
    if (!this.importUrl || !this.importKey) {
      console.warn("E-paper import credentials not configured. Skipping external update.");
      return;
    }

    try {
      const sanitizedEmail = memberEmail.replace(/[@.]/g, "_");
      const statusValue = customText || status;
      
      const url = `${this.importUrl}/?import_key=${encodeURIComponent(this.importKey)}&${sanitizedEmail}_status=${encodeURIComponent(statusValue)}`;
      
      const response = await fetch(url, { method: 'GET' });
      
      if (!response.ok) {
        console.error(`Failed to update e-paper for ${memberEmail}: ${response.status}`);
      } else {
        console.log(`Successfully updated e-paper for ${memberEmail}`);
      }
    } catch (error) {
      console.error("Error updating e-paper:", error);
      throw error;
    }
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
}

const epaperService = new EpaperService();

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware
  await setupAuth(app);

  // Auth route - get current user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all members (protected - requires login)
  app.get("/api/members", isAuthenticated, async (req, res) => {
    try {
      const members = await storage.getMembers();
      res.json(members);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ 
        error: "Failed to fetch members",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get single member (protected - requires login)
  app.get("/api/members/:id", isAuthenticated, async (req, res) => {
    try {
      const member = await storage.getMember(req.params.id);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      console.error("Error fetching member:", error);
      res.status(500).json({ 
        error: "Failed to fetch member",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update member status (protected - requires admin role)
  app.post("/api/members/status", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validated = updateStatusSchema.parse(req.body);
      
      const member = await storage.getMember(validated.memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Update status in local storage
      const updatedMember = await storage.updateMemberStatus(
        validated.memberId,
        validated.status,
        validated.customText
      );

      if (!updatedMember) {
        return res.status(404).json({ error: "Failed to update member" });
      }

      // Log status change to history
      try {
        await storage.createStatusHistory({
          memberId: validated.memberId,
          status: validated.status,
          customStatusText: validated.customText || null,
          changedBy: null, // Will be updated when we add user authentication
        });
      } catch (historyError) {
        console.error("Failed to log status change to history:", historyError);
      }

      // Send update to e-paper system
      try {
        if (member.email) {
          await epaperService.sendStatusUpdate(
            member.email,
            validated.status,
            validated.customText
          );
        }
      } catch (epaperError) {
        console.error("E-paper update failed, but local update succeeded:", epaperError);
      }

      res.json(updatedMember);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: error.errors 
        });
      }
      
      console.error("Error updating member status:", error);
      res.status(500).json({ 
        error: "Failed to update status",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get status history for a member (protected - requires login)
  app.get("/api/members/:id/history", isAuthenticated, async (req, res) => {
    try {
      const member = await storage.getMember(req.params.id);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      
      const history = await storage.getStatusHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching status history:", error);
      res.status(500).json({ 
        error: "Failed to fetch status history",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Sync statuses from e-paper system (protected - requires admin role)
  app.post("/api/sync", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const statuses = await epaperService.fetchCurrentStatuses();
      
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
        }
      }
      
      // Record sync status
      await storage.createSyncStatus({
        success: "true",
        errorMessage: null,
        updatedCount: updatedCount.toString(),
      });
      
      res.json({ 
        success: true, 
        updatedCount,
        syncedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error syncing from e-paper:", error);
      
      // Record failed sync
      await storage.createSyncStatus({
        success: "false",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        updatedCount: "0",
      });
      
      res.status(500).json({ 
        error: "Failed to sync statuses",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get latest sync status
  app.get("/api/sync/status", isAuthenticated, async (req, res) => {
    try {
      const syncStatus = await storage.getLatestSyncStatus();
      res.json(syncStatus || { success: "true", syncedAt: new Date(), updatedCount: "0" });
    } catch (error) {
      console.error("Error fetching sync status:", error);
      res.status(500).json({ 
        error: "Failed to fetch sync status",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
