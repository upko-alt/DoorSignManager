import { type Member, type InsertMember } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getMembers(): Promise<Member[]>;
  getMember(id: string): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  updateMemberStatus(id: string, status: string, customText?: string): Promise<Member | undefined>;
}

export class MemStorage implements IStorage {
  private members: Map<string, Member>;

  constructor() {
    this.members = new Map();
    
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
        ...memberData,
        lastUpdated: new Date(),
      };
      this.members.set(id, member);
    });
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
      ...insertMember,
      lastUpdated: new Date(),
    };
    this.members.set(id, member);
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
}

export const storage = new MemStorage();
