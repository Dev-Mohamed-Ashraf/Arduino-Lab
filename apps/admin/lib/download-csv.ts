import type { ExportQuery } from '@arduino-lab/contracts';

import { api, exportUrl, tokenStore } from './api';

/**
 * Downloads a report as a file.
 *
 * A plain link cannot be used: the export endpoint is staff-only and a
 * navigation carries no Authorization header. The response is fetched with the
 * token and handed to the browser as a blob instead.
 *
 * `auth.me()` runs first so an access token that expired while the page sat
 * open is refreshed by the HTTP client before the token is read out of the
 * store.
 */
export async function downloadReportCsv(query: ExportQuery): Promise<void> {
  await api.auth.me();

  const params = new URLSearchParams({ type: query.type });
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);

  const response = await fetch(exportUrl(`/reports/export?${params.toString()}`), {
    headers: { Authorization: `Bearer ${tokenStore.getAccessToken() ?? ''}` },
  });

  if (!response.ok) {
    throw new Error('export failed');
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filenameFrom(response.headers.get('content-disposition')) ?? `${query.type}.csv`;
  document.body.append(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(objectUrl);
}

/** Prefers the RFC 5987 form, which is the one that survives Arabic filenames. */
function filenameFrom(header: string | null): string | null {
  if (!header) return null;

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded?.[1]) return decodeURIComponent(encoded[1]);

  const plain = /filename="([^"]+)"/i.exec(header);
  return plain?.[1] ?? null;
}
