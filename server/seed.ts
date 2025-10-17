import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { members, type InsertMember } from "@shared/schema";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
});
const db = drizzle(pool);

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

async function seed() {
  console.log("Seeding database...");
  
  // Check if members already exist
  const existingMembers = await db.select().from(members);
  
  if (existingMembers.length > 0) {
    console.log(`Database already has ${existingMembers.length} members. Skipping seed.`);
    return;
  }
  
  // Insert sample members
  for (const member of sampleMembers) {
    await db.insert(members).values(member);
  }
  
  console.log(`Successfully seeded ${sampleMembers.length} members`);
}

seed()
  .then(() => {
    console.log("Seed completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
