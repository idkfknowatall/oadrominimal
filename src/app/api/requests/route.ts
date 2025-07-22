/**
 * API endpoint for fetching AzuraCast requestable songs
 */
import { NextResponse } from 'next/server';
import { AZURACAST_BASE_URL, AZURACAST_STATION_NAME } from '@/lib/config';
import { ApiError } from '@/lib/errors/api-errors';
import type { RequestableSong } from '@/lib/request-types';

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
    // Fetch requestable songs from AzuraCast
    const requestsUrl = `${AZURACAST_BASE_URL}/api/station/${AZURACAST_STATION_NAME}/requests`;
    
    const response = await fetch(requestsUrl, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch requests: ${response.status} ${response.statusText}`
      );
      return errorToResponse(
        new ApiError(
          `Failed to fetch requestable songs: ${response.status}`,
          response.status,
          'EXTERNAL_API_ERROR'
        )
      );
    }

    const songs: RequestableSong[] = await response.json();
    
    // Process the request data
    const processedData = {
      songs,
      totalCount: songs.length,
      lastUpdated: Date.now(),
    };

    return NextResponse.json(processedData, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Error fetching requestable songs:', error);

    if (error instanceof ApiError) {
      return errorToResponse(error);
    }

    return errorToResponse(new ApiError('Failed to fetch requestable songs'));
  }
}