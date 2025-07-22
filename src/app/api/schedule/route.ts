/**
 * API endpoint for fetching AzuraCast schedule data
 */
import { NextResponse } from 'next/server';
import { AZURACAST_BASE_URL, AZURACAST_STATION_NAME } from '@/lib/config';
import { ApiError } from '@/lib/errors/api-errors';
import type { ScheduleEntry } from '@/lib/schedule-types';

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
    const scheduleUrl = `${AZURACAST_BASE_URL}/api/station/${AZURACAST_STATION_NAME}/schedule`;
    
    // Fetch schedule data from AzuraCast
    const response = await fetch(scheduleUrl, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch schedule: ${response.status} ${response.statusText}`
      );
      return errorToResponse(
        new ApiError(
          `Failed to fetch schedule data: ${response.status}`,
          response.status,
          'EXTERNAL_API_ERROR'
        )
      );
    }

    const scheduleEntries: ScheduleEntry[] = await response.json();
    
    // Process the schedule data
    const currentEntry = scheduleEntries.find(entry => entry.is_now);
    const now = Date.now() / 1000;
    const nextEntry = scheduleEntries
      .filter(entry => entry.start_timestamp > now)
      .sort((a, b) => a.start_timestamp - b.start_timestamp)[0];

    const processedData = {
      entries: scheduleEntries,
      currentEntry,
      nextEntry,
      lastUpdated: Date.now(),
    };

    return NextResponse.json(processedData, {
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error('Error fetching schedule data:', error);

    if (error instanceof ApiError) {
      return errorToResponse(error);
    }

    return errorToResponse(new ApiError('Failed to fetch schedule data'));
  }
}