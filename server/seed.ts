import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { users } from "@shared/schema";
import bcrypt from "bcrypt";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
});
const db = drizzle(pool);

// Sample users with door sign status
const sampleUsers = [
  {
    username: "admin",
    password: "admin123",
    email: "admin@department.edu",
    firstName: "Admin",
    lastName: "User",
    epaperId: "user_admin",
    role: "admin",
    currentStatus: "Available",
    customStatusText: null,
  },
  {
    username: "sarah.chen",
    password: "password123",
    email: "sarah.chen@department.edu",
    firstName: "Sarah",
    lastName: "Chen",
    epaperId: "user1",
    role: "regular",
    currentStatus: "Available",
    customStatusText: null,
  },
  {
    username: "m.rodriguez",
    password: "password123",
    email: "m.rodriguez@department.edu",
    firstName: "Michael",
    lastName: "Rodriguez",
    epaperId: "user2",
    role: "regular",
    currentStatus: "In Meeting",
    customStatusText: "Department meeting until 3 PM",
  },
  {
    username: "e.watson",
    password: "password123",
    email: "e.watson@department.edu",
    firstName: "Emily",
    lastName: "Watson",
    epaperId: "user3",
    role: "regular",
    currentStatus: "Out",
    customStatusText: "Back tomorrow",
  },
  {
    username: "james.liu",
    password: "password123",
    email: "james.liu@department.edu",
    firstName: "James",
    lastName: "Liu",
    epaperId: "user4",
    role: "regular",
    currentStatus: "Available",
    customStatusText: null,
  },
  {
    username: "a.kowalski",
    password: "password123",
    email: "a.kowalski@department.edu",
    firstName: "Anna",
    lastName: "Kowalski",
    epaperId: "user5",
    role: "regular",
    currentStatus: "Do Not Disturb",
    customStatusText: "Research session",
  },
  {
    username: "d.kumar",
    password: "password123",
    email: "d.kumar@department.edu",
    firstName: "David",
    lastName: "Kumar",
    epaperId: "user6",
    role: "regular",
    currentStatus: "Be Right Back",
    customStatusText: null,
  },
];

async function seed() {
  console.log("Seeding database...");
  
  // Check if users already exist
  const existingUsers = await db.select().from(users);
  
  if (existingUsers.length > 0) {
    console.log(`Database already has ${existingUsers.length} users. Skipping seed.`);
    return;
  }
  
  // Insert sample users
  for (const user of sampleUsers) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await db.insert(users).values({
      username: user.username,
      passwordHash,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      epaperId: user.epaperId,
      role: user.role,
      currentStatus: user.currentStatus,
      customStatusText: user.customStatusText,
      avatarUrl: null,
    });
  }
  
  console.log(`Successfully seeded ${sampleUsers.length} users`);
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
