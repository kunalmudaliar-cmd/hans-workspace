import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // 1. Authorize session
    const sessionCookie = req.cookies.get('session')?.value;
    if (!sessionCookie || !(await verifySessionToken(sessionCookie))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = await initDb();
    const result = await pool.query('SELECT * FROM public.categories ORDER BY name ASC');
    return NextResponse.json(result.rows);
  } catch (error) {
    const err = error as Error;
    console.error('GET Categories Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authorize session
    const sessionCookie = req.cookies.get('session')?.value;
    if (!sessionCookie || !(await verifySessionToken(sessionCookie))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const categoryName = name.trim();

    if (categoryName.toLowerCase() === 'uncategorized') {
      return NextResponse.json({ error: 'Cannot create Uncategorized category manually' }, { status: 400 });
    }

    const pool = await initDb();
    
    // Check if category already exists
    const existing = await pool.query('SELECT id FROM public.categories WHERE name = $1', [categoryName]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }

    const result = await pool.query(
      'INSERT INTO public.categories (name) VALUES ($1) RETURNING *',
      [categoryName]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    const err = error as Error;
    console.error('POST Category Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
