import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not defined');
}

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({ connectionString });
} else {
  const globalWithDb = globalThis as typeof globalThis & { dbPool?: Pool };
  if (!globalWithDb.dbPool) {
    globalWithDb.dbPool = new Pool({ connectionString });
  }
  pool = globalWithDb.dbPool;
}

let dbInitialized = false;

export async function initDb() {
  if (dbInitialized) return pool;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Enable UUID generation extension
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    
    // 2. Create categories table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text UNIQUE NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // 3. Create products table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        category text NOT NULL,
        image_url text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // 4. Create users table for auth
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text UNIQUE NOT NULL,
        password_hash text NOT NULL,
        name text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // 5. Create sessions table for concurrent active session tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        token text UNIQUE NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL
      );
    `);

    // Seed Uncategorized default category
    await client.query(`
      INSERT INTO public.categories (name) 
      VALUES ('Uncategorized') 
      ON CONFLICT (name) DO NOTHING;
    `);

    // Migrate any existing items in default hardcoded categories, and delete them
    await client.query(`
      UPDATE public.products 
      SET category = 'Uncategorized' 
      WHERE category IN ('Electronics', 'Apparel', 'Furniture', 'Home & Kitchen', 'Other');
    `);
    await client.query(`
      DELETE FROM public.categories 
      WHERE name IN ('Electronics', 'Apparel', 'Furniture', 'Home & Kitchen', 'Other');
    `);

    // Seed 33 user accounts if they are not already created
    const demoUserCheck = await client.query("SELECT COUNT(*) FROM public.users WHERE email LIKE 'user%@hans.com'");
    const demoUserCount = parseInt(demoUserCheck.rows[0].count, 10);
    if (demoUserCount < 33) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('hans123', salt);
      for (let i = 1; i <= 33; i++) {
        await client.query(
          'INSERT INTO public.users (name, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
          [`Demo User ${i}`, `user${i}@hans.com`, passwordHash]
        );
      }
      console.log('Seeded missing demo user accounts.');
    }

    await client.query('COMMIT');
    dbInitialized = true;
    console.log('Database schema checked/initialized successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to initialize database schema:', error);
  } finally {
    client.release();
  }
  return pool;
}

export default pool;
