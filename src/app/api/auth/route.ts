import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { initDb } from '@/lib/db';
import { createSessionToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, password } = body;

    const pool = await initDb();

    if (action === 'signup') {
      return NextResponse.json(
        { error: 'Registration is disabled for this demo workspace. Please use one of the 33 demo user accounts.' },
        { status: 400 }
      );
    } 
    
    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      // Find user
      const userResult = await pool.query('SELECT * FROM public.users WHERE email = $1', [email.toLowerCase().trim()]);
      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const user = userResult.rows[0];

      // Compare password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      // Clean up expired sessions first
      await pool.query('DELETE FROM public.sessions WHERE expires_at < now()');

      // Count concurrent active unique users
      const activeSessionsRes = await pool.query('SELECT DISTINCT user_id FROM public.sessions');
      const activeUsers = activeSessionsRes.rows.map(r => r.user_id);

      // Check if limit is reached AND this user does not have an active session
      if (activeUsers.length >= 3 && !activeUsers.includes(user.id)) {
        return NextResponse.json(
          { error: 'Demo Limit Reached: Only 3 users/devices can be logged in concurrently.' },
          { status: 403 }
        );
      }

      // Create session token
      const token = await createSessionToken({
        userId: user.id,
        email: user.email,
        name: user.name,
      });

      // Clear previous sessions for this specific user (allows fresh logins on new devices)
      await pool.query('DELETE FROM public.sessions WHERE user_id = $1', [user.id]);

      // Save new session in database
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await pool.query(
        'INSERT INTO public.sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expiresAt]
      );

      const response = NextResponse.json({ success: true, user: { name: user.name, email: user.email } });
      
      // Set session cookie
      response.cookies.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });

      return response;
    }

    if (action === 'logout') {
      const sessionCookie = req.cookies.get('session')?.value;
      if (sessionCookie) {
        // Delete session record from the database
        await pool.query('DELETE FROM public.sessions WHERE token = $1', [sessionCookie]);
      }

      const response = NextResponse.json({ success: true });
      response.cookies.set('session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0, // Immediately delete
        path: '/',
      });
      return response;
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    const err = error as Error;
    console.error('Auth API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
