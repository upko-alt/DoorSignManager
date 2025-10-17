import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { updateStatusSchema, insertStatusOptionSchema } from "@shared/schema";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import { z } from "zod";
import bcrypt from "bcrypt";
import passport from "passport";

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

  // Login route
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    const { passwordHash: _, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });

  // Logout route
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { passwordHash: _, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
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

  // Update member status (protected - requires login, users can only update their own status)
  app.post("/api/members/status", isAuthenticated, async (req: any, res) => {
    try {
      const validated = updateStatusSchema.parse(req.body);
      const currentUser = req.user;
      
      const member = await storage.getMember(validated.memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Check authorization: admin can update any, regular user can only update their own
      if (currentUser.role !== "admin" && currentUser.memberId !== validated.memberId) {
        return res.status(403).json({ error: "You can only update your own status" });
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
          changedBy: currentUser.username,
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

  // Admin routes - User management
  app.get("/api/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove password hashes from response
      const usersWithoutPasswords = users.map(({ passwordHash, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { username, password, role, memberId, epaperId, firstName, lastName, email } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser(username, passwordHash, role || "regular", memberId, epaperId);
      
      // Update additional fields if provided
      if (firstName || lastName || email) {
        const updates: any = {};
        if (firstName) updates.firstName = firstName;
        if (lastName) updates.lastName = lastName;
        if (email) updates.email = email;
        await storage.updateUser(user.id, updates);
      }

      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { role, memberId, epaperId, firstName, lastName, email, password } = req.body;
      
      const updates: Partial<User> = {};
      if (role) updates.role = role;
      if (memberId !== undefined) updates.memberId = memberId;
      if (epaperId !== undefined) updates.epaperId = epaperId;
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (email !== undefined) updates.email = email;
      
      // Update password if provided
      if (password) {
        updates.passwordHash = await bcrypt.hash(password, 10);
      }
      
      const updatedUser = await storage.updateUser(id, updates);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { passwordHash, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user;
      
      // Prevent deleting yourself
      if (id === currentUser.id) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Admin routes - Status Options management
  app.get("/api/status-options", isAuthenticated, async (req, res) => {
    try {
      const options = await storage.getAllStatusOptions();
      res.json(options);
    } catch (error) {
      console.error("Error fetching status options:", error);
      res.status(500).json({ error: "Failed to fetch status options" });
    }
  });

  app.post("/api/status-options", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validated = insertStatusOptionSchema.parse(req.body);
      const option = await storage.createStatusOption(validated);
      res.json(option);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: error.errors 
        });
      }
      console.error("Error creating status option:", error);
      res.status(500).json({ error: "Failed to create status option" });
    }
  });

  app.patch("/api/status-options/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validated = insertStatusOptionSchema.partial().parse(req.body);
      
      // Require at least one field to update
      if (Object.keys(validated).length === 0) {
        return res.status(400).json({ error: "At least one field is required to update" });
      }
      
      const updatedOption = await storage.updateStatusOption(id, validated);
      if (!updatedOption) {
        return res.status(404).json({ error: "Status option not found" });
      }
      
      res.json(updatedOption);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: error.errors 
        });
      }
      console.error("Error updating status option:", error);
      res.status(500).json({ error: "Failed to update status option" });
    }
  });

  app.delete("/api/status-options/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteStatusOption(id);
      res.json({ message: "Status option deleted successfully" });
    } catch (error) {
      console.error("Error deleting status option:", error);
      res.status(500).json({ error: "Failed to delete status option" });
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
