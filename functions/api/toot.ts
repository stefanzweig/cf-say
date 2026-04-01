interface ToRequest {
  instance: string;
  token: string;
  status: string;
  visibility: 'public' | 'unlisted' | 'private';
}

export async function onRequestPost({ request }: { request: Request }): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body: ToRequest = await request.json();

    // Validate required fields
    if (!body.instance || !body.token || !body.status) {
      return Response.json(
        { error: 'Missing required fields: instance, token, status' },
        { status: 400, headers }
      );
    }

    // Validate visibility
    const validVisibilities = ['public', 'unlisted', 'private'];
    if (body.visibility && !validVisibilities.includes(body.visibility)) {
      return Response.json(
        { error: 'Invalid visibility. Must be one of: public, unlisted, private' },
        { status: 400, headers }
      );
    }

    // Build Mastodon API URL
    const url = `https://${body.instance}/api/v1/statuses`;

    // Forward request to Mastodon
    const mastodonResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${body.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: body.status,
        visibility: body.visibility || 'public',
      }),
    });

    if (!mastodonResponse.ok) {
      const errorText = await mastodonResponse.text();
      let errorMessage = 'Failed to post toot';

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return Response.json(
        { error: errorMessage },
        { status: mastodonResponse.status, headers }
      );
    }

    const responseData = await mastodonResponse.json();
    return Response.json(responseData, { headers });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      { error: `Proxy error: ${errorMessage}` },
      { status: 500, headers }
    );
  }
}
