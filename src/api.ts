export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-SocialCanvas": "1",
      ...options.headers,
    },
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The server is temporarily unavailable. Please try again.");
  }
  if (!response.ok)
    throw new Error(data.error ?? "Unable to complete the request.");
  return data;
}
export const send = <T>(path: string, body?: unknown, method = "POST") =>
  api<T>(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
export async function copy(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error(
    "Clipboard is unavailable. Select the text and copy it manually.",
  );
}
