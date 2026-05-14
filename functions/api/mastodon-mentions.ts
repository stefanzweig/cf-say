interface MastodonMentionsRequest {
  instance: string;
  token: string;
  limit?: number;
  max_id?: string;
  since_id?: string;
}

function clampLimit(limit: unknown): number {
  const parsed = typeof limit === 'number' ? limit : Number(limit);
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(Math.max(Math.floor(parsed), 1), 80);
}

export async function onRequestPost({ request }: { request: Request }): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body: MastodonMentionsRequest = await request.json();

    if (!body.instance || !body.token) {
      return Response.json(
        { error: 'Missing required fields: instance, token' },
        { status: 400, headers }
      );
    }

    const instance = body.instance.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const url = new URL(`https://${instance}/api/v1/notifications`);
    url.searchParams.append('types[]', 'mention');
    url.searchParams.set('limit', String(clampLimit(body.limit)));

    if (body.max_id) url.searchParams.set('max_id', body.max_id);
    if (body.since_id) url.searchParams.set('since_id', body.since_id);

    const mastodonResponse = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${body.token}`,
      },
    });

    if (!mastodonResponse.ok) {
      const errorText = await mastodonResponse.text();
      let errorMessage = 'Failed to fetch Mastodon mentions';

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

    const notifications = await mastodonResponse.json() as Array<any>;
    const mentions = notifications.map(notification => ({
      id: notification.id,
      created_at: notification.created_at,
      author_name: notification.account?.display_name || notification.account?.username || notification.account?.acct || 'Unknown',
      author_username: notification.account?.acct || notification.account?.username || '',
      avatar: notification.account?.avatar,
      html: notification.status?.content || '',
      text: notification.status?.content || '',
      url: notification.status?.url || notification.account?.url,
      raw: notification,
    }));

    return Response.json(
      {
        platform: 'mastodon',
        mentions,
      },
      { headers }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      { error: `Proxy error: ${errorMessage}` },
      { status: 500, headers }
    );
  }
}
