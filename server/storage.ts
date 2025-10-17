import { type Member, type InsertMember, type StatusHistory, type InsertStatusHistory, type User, type SyncStatus, type InsertSyncStatus, type StatusOption, type InsertStatusOption, members, statusHistory, users, syncStatus, statusOptions } from "@shared/schema";
import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(username: string, passwordHash: string, role?: string, memberId?: string, epaperId?: string): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  // Member operations
  getMembers(): Promise<Member[]>;
  getMember(id: string): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  updateMemberStatus(id: string, status: string, customText?: string): Promise<Member | undefined>;
  
  // Status history operations
  getStatusHistory(memberId: string): Promise<StatusHistory[]>;
  createStatusHistory(history: InsertStatusHistory): Promise<StatusHistory>;
  
  // Sync status operations
  getLatestSyncStatus(): Promise<SyncStatus | undefined>;
  createSyncStatus(status: InsertSyncStatus): Promise<SyncStatus>;
  
  // Status options operations
  getAllStatusOptions(): Promise<StatusOption[]>;
  getStatusOption(id: string): Promise<StatusOption | undefined>;
  createStatusOption(option: InsertStatusOption): Promise<StatusOption>;
  updateStatusOption(id: string, updates: Partial<InsertStatusOption>): Promise<StatusOption | undefined>;
  deleteStatusOption(id: string): Promise<void>;
}

// Database storage implementation
export class DbStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const sql = neon(process.env.DATABASE_URL!);
    this.db = drizzle(sql);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(username: string, passwordHash: string, role: string = "regular", memberId?: string, epaperId?: string): Promise<User> {
    // Check if this is the first user (make them admin)
    const allUsers = await this.db.select().from(users);
    const isFirstUser = allUsers.length === 0;
    
    const [user] = await this.db
      .insert(users)
      .values({
        username,
        passwordHash,
        role: isFirstUser ? "admin" : role,
        memberId: memberId || null,
        epaperId: epaperId || null,
        email: null,
        firstName: null,
        lastName: null,
      })
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await this.db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async getMembers(): Promise<Member[]> {
    return await this.db.select().from(members);
  }

  async getMember(id: string): Promise<Member | undefined> {
    const result = await this.db.select().from(members).where(eq(members.id, id));
    return result[0];
  }

  async createMember(insertMember: InsertMember): Promise<Member> {
    const result = await this.db.insert(members).values(insertMember).returning();
    return result[0];
  }

  async updateMemberStatus(
    id: string,
    status: string,
    customText?: string
  ): Promise<Member | undefined> {
    const result = await this.db
      .update(members)
      .set({
        currentStatus: status,
        customStatusText: customText || null,
        lastUpdated: new Date(),
      })
      .where(eq(members.id, id))
      .returning();
    
    return result[0];
  }

  async getStatusHistory(memberId: string): Promise<StatusHistory[]> {
    return await this.db
      .select()
      .from(statusHistory)
      .where(eq(statusHistory.memberId, memberId))
      .orderBy(desc(statusHistory.changedAt));
  }

  async createStatusHistory(history: InsertStatusHistory): Promise<StatusHistory> {
    const result = await this.db.insert(statusHistory).values(history).returning();
    return result[0];
  }

  async getLatestSyncStatus(): Promise<SyncStatus | undefined> {
    const result = await this.db
      .select()
      .from(syncStatus)
      .orderBy(desc(syncStatus.syncedAt))
      .limit(1);
    return result[0];
  }

  async createSyncStatus(status: InsertSyncStatus): Promise<SyncStatus> {
    const result = await this.db.insert(syncStatus).values(status).returning();
    return result[0];
  }

  async getAllStatusOptions(): Promise<StatusOption[]> {
    const options = await this.db.select().from(statusOptions);
    // Sort by numeric value of sortOrder since it's stored as string
    // Filter out and handle invalid sortOrder values
    return options.sort((a, b) => {
      const aOrder = parseInt(a.sortOrder);
      const bOrder = parseInt(b.sortOrder);
      // Handle NaN by treating invalid values as having highest sort order
      if (isNaN(aOrder)) return 1;
      if (isNaN(bOrder)) return -1;
      return aOrder - bOrder;
    });
  }

  async getStatusOption(id: string): Promise<StatusOption | undefined> {
    const result = await this.db.select().from(statusOptions).where(eq(statusOptions.id, id));
    return result[0];
  }

  async createStatusOption(option: InsertStatusOption): Promise<StatusOption> {
    const result = await this.db.insert(statusOptions).values(option).returning();
    return result[0];
  }

  async updateStatusOption(id: string, updates: Partial<InsertStatusOption>): Promise<StatusOption | undefined> {
    const result = await this.db
      .update(statusOptions)
      .set(updates)
      .where(eq(statusOptions.id, id))
      .returning();
    return result[0];
  }

  async deleteStatusOption(id: string): Promise<void> {
    await this.db.delete(statusOptions).where(eq(statusOptions.id, id));
  }
}

export class MemStorage implements IStorage {
  private members: Map<string, Member>;
  private history: Map<string, StatusHistory[]>;
  private usersMap: Map<string, User>;
  private statusOptionsMap: Map<string, StatusOption>;

  constructor() {
    this.members = new Map();
    this.history = new Map();
    this.usersMap = new Map();
    this.statusOptionsMap = new Map();
    
    // Add some initial sample members for demo
    const sampleMembers: InsertMember[] = [
      {
        name: "Dr. Sarah Chen",
        email: "sarah.chen@department.edu",
        currentStatus: "Available",
        customStatusText: null,
        avatarUrl: null,
      },
      {
        name: "Prof. Michael Rodriguez",
        email: "m.rodriguez@department.edu",
        currentStatus: "In Meeting",
        customStatusText: "Department meeting until 3 PM",
        avatarUrl: null,
      },
      {
        name: "Dr. Emily Watson",
        email: "e.watson@department.edu",
        currentStatus: "Out",
        customStatusText: "Back tomorrow",
        avatarUrl: null,
      },
      {
        name: "Prof. James Liu",
        email: "james.liu@department.edu",
        currentStatus: "Available",
        customStatusText: null,
        avatarUrl: null,
      },
      {
        name: "Dr. Anna Kowalski",
        email: "a.kowalski@department.edu",
        currentStatus: "Do Not Disturb",
        customStatusText: "Research session",
        avatarUrl: null,
      },
      {
        name: "Prof. David Kumar",
        email: "d.kumar@department.edu",
        currentStatus: "Be Right Back",
        customStatusText: null,
        avatarUrl: null,
      },
    ];

    sampleMembers.forEach((memberData) => {
      const id = randomUUID();
      const member: Member = {
        id,
        name: memberData.name,
        email: memberData.email ?? null,
        avatarUrl: memberData.avatarUrl ?? null,
        currentStatus: memberData.currentStatus ?? "Available",
        customStatusText: memberData.customStatusText ?? null,
        lastUpdated: new Date(),
      };
      this.members.set(id, member);
      this.history.set(id, []);
    });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(u => u.username === username);
  }

  async createUser(username: string, passwordHash: string, role: string = "regular", memberId?: string, epaperId?: string): Promise<User> {
    const id = randomUUID();
    const isFirstUser = this.usersMap.size === 0;
    
    const user: User = {
      id,
      username,
      passwordHash,
      email: null,
      firstName: null,
      lastName: null,
      role: isFirstUser ? "admin" : role,
      memberId: memberId || null,
      epaperId: epaperId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.usersMap.set(id, user);
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    this.usersMap.delete(id);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const existingUser = this.usersMap.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = {
      ...existingUser,
      ...updates,
      updatedAt: new Date(),
    };
    this.usersMap.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.usersMap.values());
  }

  async getMembers(): Promise<Member[]> {
    return Array.from(this.members.values());
  }

  async getMember(id: string): Promise<Member | undefined> {
    return this.members.get(id);
  }

  async createMember(insertMember: InsertMember): Promise<Member> {
    const id = randomUUID();
    const member: Member = {
      id,
      name: insertMember.name,
      email: insertMember.email ?? null,
      avatarUrl: insertMember.avatarUrl ?? null,
      currentStatus: insertMember.currentStatus ?? "Available",
      customStatusText: insertMember.customStatusText ?? null,
      lastUpdated: new Date(),
    };
    this.members.set(id, member);
    this.history.set(id, []);
    return member;
  }

  async updateMemberStatus(
    id: string,
    status: string,
    customText?: string
  ): Promise<Member | undefined> {
    const member = this.members.get(id);
    if (!member) {
      return undefined;
    }

    const updatedMember: Member = {
      ...member,
      currentStatus: status,
      customStatusText: customText || null,
      lastUpdated: new Date(),
    };

    this.members.set(id, updatedMember);
    return updatedMember;
  }

  async getStatusHistory(memberId: string): Promise<StatusHistory[]> {
    return this.history.get(memberId) || [];
  }

  async createStatusHistory(history: InsertStatusHistory): Promise<StatusHistory> {
    const id = randomUUID();
    const record: StatusHistory = {
      id,
      memberId: history.memberId,
      status: history.status,
      customStatusText: history.customStatusText ?? null,
      changedBy: history.changedBy ?? null,
      changedAt: new Date(),
    };
    
    const memberHistory = this.history.get(history.memberId) || [];
    memberHistory.unshift(record);
    this.history.set(history.memberId, memberHistory);
    
    return record;
  }

  async getLatestSyncStatus(): Promise<SyncStatus | undefined> {
    // MemStorage doesn't persist sync status
    return undefined;
  }

  async createSyncStatus(status: InsertSyncStatus): Promise<SyncStatus> {
    // MemStorage doesn't persist sync status - return a mock object
    return {
      id: randomUUID(),
      syncedAt: new Date(),
      success: status.success ?? "true",
      errorMessage: status.errorMessage ?? null,
      updatedCount: status.updatedCount ?? "0",
    };
  }

  async getAllStatusOptions(): Promise<StatusOption[]> {
    return Array.from(this.statusOptionsMap.values()).sort((a, b) => {
      const aOrder = parseInt(a.sortOrder);
      const bOrder = parseInt(b.sortOrder);
      // Handle NaN by treating invalid values as having highest sort order
      if (isNaN(aOrder)) return 1;
      if (isNaN(bOrder)) return -1;
      return aOrder - bOrder;
    });
  }

  async getStatusOption(id: string): Promise<StatusOption | undefined> {
    return this.statusOptionsMap.get(id);
  }

  async createStatusOption(option: InsertStatusOption): Promise<StatusOption> {
    const id = randomUUID();
    const newOption: StatusOption = {
      id,
      name: option.name,
      color: option.color ?? "blue",
      sortOrder: option.sortOrder ?? "0",
      createdAt: new Date(),
    };
    this.statusOptionsMap.set(id, newOption);
    return newOption;
  }

  async updateStatusOption(id: string, updates: Partial<InsertStatusOption>): Promise<StatusOption | undefined> {
    const existing = this.statusOptionsMap.get(id);
    if (!existing) return undefined;
    
    const updated: StatusOption = {
      ...existing,
      ...updates,
    };
    this.statusOptionsMap.set(id, updated);
    return updated;
  }

  async deleteStatusOption(id: string): Promise<void> {
    this.statusOptionsMap.delete(id);
  }
}

// Use database storage in production, memory storage for development
export const storage = process.env.DATABASE_URL ? new DbStorage() : new MemStorage();
