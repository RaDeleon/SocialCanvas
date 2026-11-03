// Media requests use Authorization headers. Meta's token exchange/refresh endpoints
// require query parameters; these URLs must never be logged.
export async function metaRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  if (!response.ok || body.error)
    throw new Error(
      body.error?.code === 190
        ? "Instagram access expired. Please reconnect."
        : "Instagram could not complete the request. Try again or reconnect.",
    );
  return body;
}
export async function exchangeCode(code, env) {
  const short = await metaRequest(
    "https://api.instagram.com/oauth/access_token",
    null,
    {
      method: "POST",
      body: new URLSearchParams({
        client_id: env.metaAppId,
        client_secret: env.metaAppSecret,
        grant_type: "authorization_code",
        redirect_uri: env.redirectUri,
        code,
      }),
    },
  );
  const shortToken = short.access_token ?? short.data?.[0]?.access_token;
  if (!shortToken) throw new Error("Instagram did not return an access token.");
  const url = new URL("https://graph.instagram.com/access_token");
  url.search = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: env.metaAppSecret,
    access_token: shortToken,
  }).toString();
  return metaRequest(url);
}
export async function refreshToken(token) {
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.search = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: token,
  }).toString();
  return metaRequest(url);
}
export async function getProfile(token, version) {
  return metaRequest(
    `https://graph.instagram.com/${version}/me?fields=user_id,username,name,profile_picture_url`,
    token,
  );
}
export async function getMedia(token, version) {
  const fields =
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url,thumbnail_url}";
  const body = await metaRequest(
    `https://graph.instagram.com/${version}/me/media?fields=${fields}&limit=100`,
    token,
  );
  return (body.data ?? []).map((p) => ({
    id: p.id,
    type: p.media_type,
    url: p.media_url ?? "",
    thumbnail: p.thumbnail_url ?? null,
    caption: p.caption ?? "",
    permalink: p.permalink,
    timestamp: p.timestamp,
    children: (p.children?.data ?? []).map((c) => ({
      id: c.id,
      type: c.media_type,
      url: c.media_url,
      thumbnail: c.thumbnail_url ?? null,
    })),
  }));
}
