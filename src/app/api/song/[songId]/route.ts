/**
 * Song API endpoint - Database unavailable
 * This endpoint is no longer functional as the database has been removed from the application.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ songId: string }> }
) {
  const { songId } = await params;
  if (!songId) {
    return NextResponse.json({ error: 'songId is required' }, { status: 400 });
  }

  // Database has been removed - this endpoint is no longer functional
  return Response.json(
    { error: 'Song database is not available. The database has been removed from this application.' },
    { status: 503 }
  );
}
