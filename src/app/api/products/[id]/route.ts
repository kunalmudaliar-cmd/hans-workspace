import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authorize session
    const sessionCookie = req.cookies.get('session')?.value;
    if (!sessionCookie || !(await verifySessionToken(sessionCookie))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, category, image_url } = body;

    if (!name || !category) {
      return NextResponse.json({ error: 'Name and Category are required' }, { status: 400 });
    }

    const pool = await initDb();

    // Enforce 100 image limit on update
    if (image_url) {
      const checkRes = await pool.query('SELECT image_url FROM public.products WHERE id = $1', [id]);
      const currentImage = checkRes.rows[0]?.image_url;
      if (!currentImage) {
        const countRes = await pool.query('SELECT COUNT(*) FROM public.products WHERE image_url IS NOT NULL');
        const imageCount = parseInt(countRes.rows[0].count, 10);
        if (imageCount >= 100) {
          return NextResponse.json(
            { error: 'Demo Limit Reached: A maximum of 100 products with images is allowed for this workspace.' },
            { status: 400 }
          );
        }
      }
    }

    const result = await pool.query(
      'UPDATE public.products SET name = $1, category = $2, image_url = $3, updated_at = now() WHERE id = $4 RETURNING *',
      [name.trim(), category.trim(), image_url?.trim() || null, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    const err = error as Error;
    console.error('PUT Product Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authorize session
    const sessionCookie = req.cookies.get('session')?.value;
    if (!sessionCookie || !(await verifySessionToken(sessionCookie))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const pool = await initDb();
    const result = await pool.query('DELETE FROM public.products WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: result.rows[0] });
  } catch (error) {
    const err = error as Error;
    console.error('DELETE Product Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
