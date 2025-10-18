import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcrypt';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function initializeDatabase() {
  let pool;
  
  try {
    console.log('🔧 Initializing database...');

    // Check required environment variables
    if (!process.env.ADMIN_USERNAME) {
      throw new Error('ADMIN_USERNAME environment variable is required');
    }
    if (!process.env.ADMIN_PASSWORD) {
      throw new Error('ADMIN_PASSWORD environment variable is required');
    }
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Connect to database using standard pg driver
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    // Check if any admin user exists
    console.log('📊 Checking for existing admin users...');
    const existingAdmins = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .limit(1);

    if (existingAdmins.length > 0) {
      console.log('✅ Admin user already exists - skipping creation');
      console.log(`   Admin username: ${existingAdmins[0].username}`);
      await pool.end();
      process.exit(0);
    }

    // Create default admin user
    console.log('👤 No admin found - creating default admin user...');
    
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;
    const email = process.env.ADMIN_EMAIL || `${username}@department.edu`;

    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(password, 10);

    console.log('💾 Creating admin user...');
    await db.insert(users).values({
      username,
      passwordHash,
      email,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      epaperId: 'user_admin',
      currentStatus: 'Available',
    });

    console.log('\n✅ Database initialized successfully!');
    console.log('\n📝 Admin credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Email: ${email}`);
    console.log('\n⚠️  SECURITY WARNING: Change the admin password after first login!\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error initializing database:', error instanceof Error ? error.message : error);
    if (pool) {
      await pool.end();
    }
    process.exit(1);
  }
}

initializeDatabase();
