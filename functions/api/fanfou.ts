interface FanfouRequest {
  consumer_key: string;
  consumer_secret: string;
  access_token: string;
  access_token_secret: string;
  status: string;
}

// Generate OAuth 1.0a signature using Web Crypto API
async function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): Promise<string> {
  // Sort parameters by key and encode
  const normalizedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(normalizedParams)}`;
  const key = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

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
  const base64Signature = btoa(String.fromCharCode(...signatureArray));

  return base64Signature;
}

// Generate OAuth header
async function generateOAuthHeader(
  url: string,
  method: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  tokenSecret: string,
  additionalParams: Record<string, string> = {}
): Promise<string> {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_token: accessToken,
    oauth_nonce: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_version: '1.0',
    ...additionalParams,
  };

  const signature = await generateOAuthSignature(method, url, oauthParams, consumerSecret, tokenSecret);
  oauthParams.oauth_signature = signature;

  const headerParts = Object.entries(oauthParams)
    .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
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
    const body: FanfouRequest = await request.json();

    // Validate required fields
    if (!body.consumer_key || !body.consumer_secret || !body.access_token || !body.access_token_secret || !body.status) {
      return Response.json(
        { error: 'Missing required fields: consumer_key, consumer_secret, access_token, access_token_secret, status' },
        { status: 400, headers }
      );
    }

    // OAuth signature requires http:// URL in base string
    const signatureUrl = 'http://api.fanfou.com/statuses/update.json';
    // But fetch requires https:// URL
    const fetchUrl = 'https://api.fanfou.com/statuses/update.json';

    // Generate OAuth header with status parameter included in signature
    const oauthHeader = await generateOAuthHeader(
      signatureUrl,
      'POST',
      body.consumer_key,
      body.consumer_secret,
      body.access_token,
      body.access_token_secret,
      { status: body.status }
    );

    // Forward request to Fanfou
    const fanfouResponse = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Authorization': oauthHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `status=${encodeURIComponent(body.status)}`,
    });

    if (!fanfouResponse.ok) {
      const errorText = await fanfouResponse.text();

      let errorMessage = 'Failed to post to Fanfou';

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return Response.json(
        { error: errorMessage },
        { status: fanfouResponse.status, headers }
      );
    }

    const responseData = await fanfouResponse.json();
    return Response.json(responseData, { headers });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      { error: `Proxy error: ${errorMessage}` },
      { status: 500, headers }
    );
  }
}
