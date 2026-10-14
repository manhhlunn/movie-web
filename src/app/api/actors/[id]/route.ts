import { NextRequest, NextResponse } from 'next/server';
import { getActorMovies } from '@/application/useCases/ActorUseCases';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const fallbackName = searchParams.get('name') || undefined;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Thiếu ID diễn viên.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const data = await getActorMovies(id, fallbackName);

    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        },
      }
    );
  } catch (err: any) {
    console.error('[API Actors] Error fetching actor movies:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
