import { type Member, type InsertMember, type StatusHistory, type InsertStatusHistory, type User, type UpsertUser, members, statusHistory, users } from "@shared/schema";
import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Member operations
  getMembers(): Promise<Member[]>;
  getMember(id: string): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  updateMemberStatus(id: string, status: string, customText?: string): Promise<Member | undefined>;
  
  // Status history operations
  getStatusHistory(memberId: string): Promise<StatusHistory[]>;
  createStatusHistory(history: InsertStatusHistory): Promise<StatusHistory>;
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if this is the first user (make them admin)
    const allUsers = await this.db.select().from(users);
    const isFirstUser = allUsers.length === 0;
    
    const [user] = await this.db
      .insert(users)
      .values({
        ...userData,
        role: isFirstUser ? "admin" : (userData.role || "regular"),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
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
}

export class MemStorage implements IStorage {
  private members: Map<string, Member>;
  private history: Map<string, StatusHistory[]>;
  private usersMap: Map<string, User>;

  constructor() {
    this.members = new Map();
    this.history = new Map();
    this.usersMap = new Map();
    
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.usersMap.get(userData.id!);
    const user: User = {
      id: userData.id!,
      email: userData.email ?? null,
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? null,
      role: userData.role ?? existingUser?.role ?? "regular",
      createdAt: existingUser?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
    this.usersMap.set(user.id, user);
    return user;
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
}

// Use database storage in production, memory storage for development
export const storage = process.env.DATABASE_URL ? new DbStorage() : new MemStorage();
