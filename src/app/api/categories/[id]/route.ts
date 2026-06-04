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
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const newName = name.trim();

    if (newName.toLowerCase() === 'uncategorized') {
      return NextResponse.json({ error: 'Cannot rename a category to Uncategorized' }, { status: 400 });
    }

    const pool = await initDb();
    
    // Get the old category name first
    const originalRes = await pool.query('SELECT name FROM public.categories WHERE id = $1', [id]);
    if (originalRes.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    const oldName = originalRes.rows[0].name;

    if (oldName.toLowerCase() === 'uncategorized') {
      return NextResponse.json({ error: 'Cannot modify or rename the Uncategorized category' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update categories table
      const updateCatRes = await client.query(
        'UPDATE public.categories SET name = $1, updated_at = now() WHERE id = $2 RETURNING *',
        [newName, id]
      );

      // Cascade update products using this category string
      await client.query(
        'UPDATE public.products SET category = $1 WHERE category = $2',
        [newName, oldName]
      );

      await client.query('COMMIT');
      return NextResponse.json(updateCatRes.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    const err = error as Error;
    console.error('PUT Category Error:', err);
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
    
    // Get category details
    const catRes = await pool.query('SELECT name FROM public.categories WHERE id = $1', [id]);
    if (catRes.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const catName = catRes.rows[0].name;

    if (catName.toLowerCase() === 'uncategorized') {
      return NextResponse.json({ error: 'Cannot delete the Uncategorized category' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete from categories table
      await client.query('DELETE FROM public.categories WHERE id = $1', [id]);

      // Reassign matching products category to 'Uncategorized'
      await client.query(
        'UPDATE public.products SET category = $1 WHERE category = $2',
        ['Uncategorized', catName]
      );

      await client.query('COMMIT');
      return NextResponse.json({ success: true, name: catName });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    const err = error as Error;
    console.error('DELETE Category Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
