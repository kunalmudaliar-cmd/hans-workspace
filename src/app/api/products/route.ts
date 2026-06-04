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

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('q');

    const pool = await initDb();

    let query = 'SELECT * FROM public.products';
    const params: string[] = [];
    const conditions: string[] = [];

    if (category && category !== 'All') {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      conditions.push(`name ILIKE $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    const err = error as Error;
    console.error('GET Products Error:', err);
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
    const { name, category, image_url } = body;

    if (!name || !category) {
      return NextResponse.json({ error: 'Name and Category are required' }, { status: 400 });
    }

    const pool = await initDb();

    // Enforce 100 image limit
    if (image_url) {
      const countRes = await pool.query('SELECT COUNT(*) FROM public.products WHERE image_url IS NOT NULL');
      const imageCount = parseInt(countRes.rows[0].count, 10);
      if (imageCount >= 100) {
        return NextResponse.json(
          { error: 'Demo Limit Reached: A maximum of 100 products with images is allowed for this workspace.' },
          { status: 400 }
        );
      }
    }

    const result = await pool.query(
      'INSERT INTO public.products (name, category, image_url) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), category.trim(), image_url?.trim() || null]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    const err = error as Error;
    console.error('POST Product Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
