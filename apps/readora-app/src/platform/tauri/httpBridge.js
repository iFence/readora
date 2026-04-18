import { Channel, invoke } from '@tauri-apps/api/core';

const NO_BODY_STATUS_CODES = new Set([101, 103, 204, 205, 304]);
const REQUEST_CANCELLED = 'Request cancelled';

function normalizeHeaders(headers) {
  const normalized = headers
    ? headers instanceof Headers
      ? headers
      : new Headers(headers)
    : new Headers();

  return Array.from(normalized.entries()).map(([name, value]) => [name, String(value)]);
}

function concatUint8Arrays(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

async function readResponseBody(responseRid) {
  const chunks = [];
  const streamChannel = new Channel(message => {
    const chunk = message instanceof Uint8Array ? message : new Uint8Array(message);
    const marker = chunk[chunk.length - 1];
    if (marker === 1) {
      return;
    }

    chunks.push(chunk.slice(0, chunk.length - 1));
  });

  await invoke('plugin:http|fetch_read_body', {
    rid: responseRid,
    streamChannel,
  });

  return concatUint8Arrays(chunks);
}

export async function sendHttpRequest(url, options = {}) {
  const signal = options.signal;
  if (signal?.aborted) {
    throw new Error(REQUEST_CANCELLED);
  }

  const request = new Request(url, options);
  const bodyBuffer = await request.arrayBuffer();
  const requestRid = await invoke('plugin:http|fetch', {
    clientConfig: {
      method: request.method,
      url: request.url,
      headers: normalizeHeaders(request.headers),
      data: bodyBuffer.byteLength ? Array.from(new Uint8Array(bodyBuffer)) : null,
      connectTimeout: options.connectTimeout,
      maxRedirections: options.maxRedirections,
      proxy: options.proxy,
      danger: options.danger,
    },
  });

  const cancelRequest = () => invoke('plugin:http|fetch_cancel', { rid: requestRid });

  if (signal?.aborted) {
    await cancelRequest().catch(() => {});
    throw new Error(REQUEST_CANCELLED);
  }

  signal?.addEventListener('abort', () => {
    void cancelRequest().catch(() => {});
  }, { once: true });

  const responseMeta = await invoke('plugin:http|fetch_send', { rid: requestRid });
  const responseHeaders = new Headers(responseMeta.headers);
  const body = NO_BODY_STATUS_CODES.has(responseMeta.status)
    ? null
    : await readResponseBody(responseMeta.rid);

  const response = new Response(body, {
    status: responseMeta.status,
    statusText: responseMeta.statusText,
    headers: responseHeaders,
  });

  Object.defineProperty(response, 'url', { value: responseMeta.url });
  return response;
}
