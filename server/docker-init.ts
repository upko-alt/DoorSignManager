import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import bcrypt from 'bcrypt';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database...');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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
      process.exit(0);
    }

    // Create default admin user
    console.log('👤 No admin found - creating default admin user...');
    
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const email = process.env.ADMIN_EMAIL || 'admin@department.edu';

    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(password, 10);

    console.log('💾 Creating admin user...');
    const [newAdmin] = await db.insert(users).values({
      username,
      passwordHash,
      email,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      epaperId: 'user_admin',
      currentStatus: 'Available',
    }).returning();

    console.log('\n✅ Database initialized successfully!');
    console.log('\n📝 Default admin credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  SECURITY WARNING: Change the admin password after first login!\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
