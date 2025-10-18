import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { updateStatusSchema, insertStatusOptionSchema, type User } from "@shared/schema";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import { z } from "zod";
import bcrypt from "bcrypt";
import passport from "passport";
import { syncService } from "./syncService";

// E-paper API service
class EpaperService {
  async sendStatusUpdate(importUrl: string, importKey: string, username: string, status: string, customText?: string): Promise<void> {
    if (!importUrl || !importKey) {
      console.warn(`E-paper import credentials not configured for ${username}. Skipping external update.`);
      return;
    }

    try {
      const statusValue = customText || status;
      
      const url = `${importUrl}/?import_key=${encodeURIComponent(importKey)}&status_${username}=${encodeURIComponent(statusValue)}`;
      
      const response = await fetch(url, { method: 'GET' });
      
      if (!response.ok) {
        console.error(`Failed to update e-paper for ${username}: ${response.status}`);
      } else {
        console.log(`Successfully updated e-paper for ${username}`);
      }
    } catch (error) {
      console.error(`Error updating e-paper for ${username}:`, error);
      throw error;
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

  // Get all users with their status (protected - requires login)
  app.get("/api/members", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const users = await storage.getAllUsers();
      
      // Filter sensitive fields for non-admin users
      const sanitizedUsers = users.map((user) => {
        const { passwordHash, epaperApiKey, epaperImportUrl, epaperExportUrl, ...publicUser } = user;
        
        // Only admins can see e-paper credentials
        if (currentUser.role === "admin") {
          return { ...publicUser, epaperApiKey, epaperImportUrl, epaperExportUrl };
        }
        
        return publicUser;
      });
      
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ 
        error: "Failed to fetch users",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get single user with status (protected - requires login)
  app.get("/api/members/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { passwordHash, epaperApiKey, epaperImportUrl, epaperExportUrl, ...publicUser } = user;
      
      // Only admins can see e-paper credentials
      if (currentUser.role === "admin") {
        res.json({ ...publicUser, epaperApiKey, epaperImportUrl, epaperExportUrl });
      } else {
        res.json(publicUser);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ 
        error: "Failed to fetch user",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update user status (protected - requires login, users can only update their own status)
  app.post("/api/members/status", isAuthenticated, async (req: any, res) => {
    try {
      const validated = updateStatusSchema.parse(req.body);
      const currentUser = req.user;
      
      const user = await storage.getUser(validated.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check authorization: admin can update any, regular user can only update their own
      if (currentUser.role !== "admin" && currentUser.id !== validated.userId) {
        return res.status(403).json({ error: "You can only update your own status" });
      }

      // Update status in local storage
      const updatedUser = await storage.updateUserStatus(
        validated.userId,
        validated.status,
        validated.customText
      );

      if (!updatedUser) {
        return res.status(404).json({ error: "Failed to update user" });
      }

      // Log status change to history
      try {
        await storage.createStatusHistory({
          userId: validated.userId,
          status: validated.status,
          customStatusText: validated.customText || null,
          changedBy: currentUser.username,
        });
      } catch (historyError) {
        console.error("Failed to log status change to history:", historyError);
      }

      // Send update to e-paper system using per-user credentials
      try {
        if (user.epaperImportUrl && user.epaperApiKey) {
          await epaperService.sendStatusUpdate(
            user.epaperImportUrl,
            user.epaperApiKey,
            user.username,
            validated.status,
            validated.customText
          );
        }
      } catch (epaperError) {
        console.error("E-paper update failed, but local update succeeded:", epaperError);
      }

      // Filter sensitive fields for non-admin users
      const { passwordHash, epaperApiKey, epaperImportUrl, epaperExportUrl, ...publicUser } = updatedUser;
      
      if (currentUser.role === "admin") {
        res.json({ ...publicUser, epaperApiKey, epaperImportUrl, epaperExportUrl });
      } else {
        res.json(publicUser);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: error.errors 
        });
      }
      
      console.error("Error updating user status:", error);
      res.status(500).json({ 
        error: "Failed to update status",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get status history for a user (protected - requires login)
  app.get("/api/members/:id/history", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
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
      const { username, password, role, epaperId, firstName, lastName, email, epaperImportUrl, epaperExportUrl, epaperApiKey } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      if (!epaperId) {
        return res.status(400).json({ error: "E-paper ID is required" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user with all fields
      const user = await storage.createUser(username, passwordHash, role || "regular", epaperId, email, firstName, lastName, epaperImportUrl, epaperExportUrl, epaperApiKey);

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
      const { role, epaperId, firstName, lastName, email, password, epaperImportUrl, epaperExportUrl, epaperApiKey } = req.body;
      
      const updates: Partial<User> = {};
      if (role) updates.role = role;
      if (epaperId !== undefined) updates.epaperId = epaperId;
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (email !== undefined) updates.email = email;
      if (epaperImportUrl !== undefined) updates.epaperImportUrl = epaperImportUrl;
      if (epaperExportUrl !== undefined) updates.epaperExportUrl = epaperExportUrl;
      if (epaperApiKey !== undefined) updates.epaperApiKey = epaperApiKey;
      
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
      const result = await syncService.performSync();
      
      if (result.success) {
        res.json({ 
          success: true, 
          updatedCount: result.updatedCount,
          syncedAt: new Date().toISOString()
        });
      } else {
        res.status(500).json({ 
          error: "Failed to sync statuses",
          message: result.error || "Unknown error"
        });
      }
    } catch (error) {
      console.error("Error syncing from e-paper:", error);
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
