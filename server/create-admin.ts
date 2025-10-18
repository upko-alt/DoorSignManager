import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import bcrypt from 'bcrypt';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function createAdmin() {
  try {
    // Get username and password from command line args or use defaults
    const username = process.argv[2] || 'admin';
    const password = process.argv[3] || 'admin123';
    const email = process.argv[4] || `${username}@department.edu`;

    console.log('\n🔧 Creating admin user...');
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser.length > 0) {
      console.log(`\n⚠️  User "${username}" already exists!`);
      console.log('If you want to reset the password, delete the user first or use a different username.\n');
      process.exit(1);
    }

    // Hash the password
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the admin user
    console.log('💾 Inserting admin user into database...');
    const [newUser] = await db.insert(users).values({
      username,
      passwordHash,
      email,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      epaperId: `admin_${username}`,
      currentStatus: 'Available',
    }).returning();

    console.log('\n✅ Admin user created successfully!');
    console.log('\n📝 Login credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: admin\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();
