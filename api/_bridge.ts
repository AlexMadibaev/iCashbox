export default async function bridge(
  request: any,
  response: any,
  handler: (request: Request) => Promise<Response> | Response
) {
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const host = request.headers.host || 'localhost';
  const url = `${protocol}://${host}${request.url || '/'}`;
  const headers = new Headers();

  Object.entries(request.headers || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item));
      return;
    }
    if (typeof value !== 'undefined') headers.set(key, String(value));
  });

  const method = request.method || 'GET';
  const body =
    method === 'GET' || method === 'HEAD'
      ? undefined
      : typeof request.body === 'string' || request.body instanceof Buffer
        ? request.body
        : JSON.stringify(request.body || {});

  const webResponse = await handler(new Request(url, { body, headers, method }));
  response.status(webResponse.status);
  webResponse.headers.forEach((value, key) => response.setHeader(key, value));
  response.send(await webResponse.text());
}
