/**
 * API endpoint for submitting song requests to AzuraCast
 */
import { NextRequest, NextResponse } from 'next/server';
import { AZURACAST_BASE_URL } from '@/lib/config';
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { request_url } = body;

    if (!request_url) {
      return errorToResponse(
        new ApiError('Missing request_url parameter', 400, 'MISSING_PARAMETER')
      );
    }

    // Build the full URL if it's a relative path
    const fullUrl = request_url.startsWith('http')
      ? request_url
      : `${AZURACAST_BASE_URL}${request_url}`;

    // Validate that the request_url is from the correct AzuraCast instance
    if (!fullUrl.startsWith(AZURACAST_BASE_URL)) {
      return errorToResponse(
        new ApiError('Invalid request URL', 400, 'INVALID_REQUEST_URL')
      );
    }

    // Submit the request to AzuraCast
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: await response.text() };
      }
      
      console.error(
        `Failed to submit request: ${response.status} ${response.statusText}`,
        errorData
      );
      
      // Handle specific AzuraCast error responses
      if (response.status === 429) {
        return errorToResponse(
          new ApiError('Too many requests. Please wait before requesting another song.', 429, 'RATE_LIMITED')
        );
      } else if (response.status === 404) {
        return errorToResponse(
          new ApiError('Song not found or no longer available for request.', 404, 'SONG_NOT_FOUND')
        );
      } else if (response.status === 500 && errorData.message) {
        // Handle AzuraCast's specific error messages (like cooldown periods)
        return errorToResponse(
          new ApiError(errorData.message, 400, 'AZURACAST_RESTRICTION')
        );
      } else {
        return errorToResponse(
          new ApiError(
            errorData.message || `Failed to submit song request: ${response.status}`,
            response.status,
            'EXTERNAL_API_ERROR'
          )
        );
      }
    }

    // Try to parse the response, but handle cases where it might not be JSON
    let responseData;
    try {
      responseData = await response.json();
    } catch {
      // If response is not JSON, treat as success
      responseData = { success: true };
    }

    return NextResponse.json({
      success: true,
      message: 'Song request submitted successfully!',
      data: responseData,
    });

  } catch (error) {
    console.error('Error submitting song request:', error);

    if (error instanceof ApiError) {
      return errorToResponse(error);
    }

    return errorToResponse(new ApiError('Failed to submit song request'));
  }
}