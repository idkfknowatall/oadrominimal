/**
 * The canonical documentation for this API endpoint is located in the OpenAPI specification.
 *
 * @see /docs/openapi.yml
 */
import { NextResponse } from 'next/server';
import { AZURACAST_BASE_URL, AZURACAST_STATION_NAME } from '@/lib/config';
import { ApiError } from '@/lib/errors/api-errors';

// Opt out of caching for this route
export const dynamic = 'force-dynamic';

/**
 * Helper function to convert ApiError instances to NextResponse objects
 */
function errorToResponse(error: ApiError): NextResponse {
  return NextResponse.json(
    {
      error: {
        message: error.message,
        code: error.code,
      },
    },
    { status: error.statusCode }
  );
}

export async function GET() {
  try {
    const metaUrl = `${AZURACAST_BASE_URL}/api/nowplaying/${AZURACAST_STATION_NAME}`;
    // Fetch on the server to avoid CORS issues in the browser
    const response = await fetch(metaUrl);

    if (!response.ok) {
      // Don't throw an error, just return a structured error response
      console.error(
        `Failed to fetch metadata: ${response.status} ${response.statusText}`
      );
      return errorToResponse(
        new ApiError(
          `Failed to fetch radio metadata: ${response.status}`,
          response.status,
          'EXTERNAL_API_ERROR'
        )
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching radio metadata:', error);

    if (error instanceof ApiError) {
      return errorToResponse(error);
    }

    return errorToResponse(new ApiError('Failed to fetch radio metadata'));
  }
}
