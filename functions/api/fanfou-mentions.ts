interface FanfouMentionsRequest {
  consumer_key: string;
  consumer_secret: string;
  access_token: string;
  access_token_secret: string;
  count?: number;
  page?: number;
  since_id?: string;
  max_id?: string;
}

function clampCount(count: unknown): number {
  const parsed = typeof count === 'number' ? count : Number(count);
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(Math.max(Math.floor(parsed), 1), 60);
}

function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

// Generate OAuth 1.0a signature using Web Crypto API
async function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): Promise<string> {
  const normalizedParams = Object.keys(params)
    .sort()
    .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');

  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(normalizedParams)}`;
  const key = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(baseString);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureArray = Array.from(new Uint8Array(signature));
  return btoa(String.fromCharCode(...signatureArray));
}

// Generate OAuth header. Extra request params are included in signature only.
async function generateOAuthHeader(
  url: string,
  method: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  tokenSecret: string,
  requestParams: Record<string, string> = {}
): Promise<string> {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_token: accessToken,
    oauth_nonce: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_version: '1.0',
  };

  const signature = await generateOAuthSignature(
    method,
    url,
    { ...oauthParams, ...requestParams },
    consumerSecret,
    tokenSecret
  );

  const headerParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  const headerParts = Object.entries(headerParams)
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

export async function onRequestPost({ request }: { request: Request }): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body: FanfouMentionsRequest = await request.json();

    if (!body.consumer_key || !body.consumer_secret || !body.access_token || !body.access_token_secret) {
      return Response.json(
        { error: 'Missing required fields: consumer_key, consumer_secret, access_token, access_token_secret' },
        { status: 400, headers }
      );
    }

    const signatureUrl = 'http://api.fanfou.com/statuses/mentions.json';
    const fetchUrl = new URL('https://api.fanfou.com/statuses/mentions.json');

    const queryParams: Record<string, string> = {
      count: String(clampCount(body.count)),
    };

    if (body.page) queryParams.page = String(body.page);
    if (body.since_id) queryParams.since_id = body.since_id;
    if (body.max_id) queryParams.max_id = body.max_id;

    Object.entries(queryParams).forEach(([key, value]) => {
      fetchUrl.searchParams.set(key, value);
    });

    const oauthHeader = await generateOAuthHeader(
      signatureUrl,
      'GET',
      body.consumer_key,
      body.consumer_secret,
      body.access_token,
      body.access_token_secret,
      queryParams
    );

    const fanfouResponse = await fetch(fetchUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': oauthHeader,
      },
    });

    if (!fanfouResponse.ok) {
      const errorText = await fanfouResponse.text();
      let errorMessage = 'Failed to fetch Fanfou mentions';

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.error_msg || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return Response.json(
        { error: errorMessage },
        { status: fanfouResponse.status, headers }
      );
    }

    const statuses = await fanfouResponse.json() as Array<any>;
    const mentions = statuses.map(status => ({
      id: status.id,
      created_at: status.created_at,
      author_name: status.user?.name || status.user?.screen_name || 'Unknown',
      author_username: status.user?.screen_name || '',
      avatar: status.user?.profile_image_url,
      text: status.text || '',
      html: '',
      url: status.id ? `https://fanfou.com/statuses/${status.id}` : status.user?.url,
      raw: status,
    }));

    return Response.json(
      {
        platform: 'fanfou',
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
