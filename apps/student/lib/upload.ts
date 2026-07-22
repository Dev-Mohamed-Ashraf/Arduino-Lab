import { ID_CARD_ALLOWED_MIME_TYPES, ID_CARD_MAX_BYTES } from '@arduino-lab/contracts';

import { api } from './api';

export interface UploadedImage {
  url: string;
  publicId: string;
}

export class UploadError extends Error {}

/**
 * Uploads an image straight from the browser to Cloudinary.
 *
 * The file never touches our API server: Render's free instance has a small
 * memory ceiling that image uploads would exhaust. Every field below is part of
 * what the server signed, so changing any of them invalidates the signature and
 * Cloudinary rejects the request — that is what keeps the folder, size cap and
 * format whitelist enforceable from the client side.
 */
export async function uploadIdCard(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadedImage> {
  assertAcceptable(file);

  const signature = await api.uploads.signature();

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signature.apiKey);
  form.append('timestamp', String(signature.timestamp));
  form.append('signature', signature.signature);
  form.append('folder', signature.folder);
  form.append('allowed_formats', 'jpg,jpeg,png,webp');
  form.append('max_bytes', String(ID_CARD_MAX_BYTES));
  form.append('transformation', 'c_limit,w_1600,h_1600,q_auto,f_auto');

  const response = await postWithProgress(signature.uploadUrl, form, onProgress);

  return { url: response.secure_url, publicId: response.public_id };
}

/** Rejects unusable files before spending a round trip on a signature. */
export function assertAcceptable(file: File): void {
  if (file.size > ID_CARD_MAX_BYTES) {
    throw new UploadError('حجم الصورة أكبر من الحد المسموح (5 ميجابايت).');
  }

  if (!ID_CARD_ALLOWED_MIME_TYPES.includes(file.type as (typeof ID_CARD_ALLOWED_MIME_TYPES)[number])) {
    throw new UploadError('صيغة الملف غير مدعومة. المسموح: JPG أو PNG أو WEBP.');
  }
}

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
}

/** XHR rather than fetch: only XHR reports upload progress. */
function postWithProgress(
  url: string,
  body: FormData,
  onProgress?: (percent: number) => void,
): Promise<CloudinaryResponse> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', url);

    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    });

    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) {
        resolve(JSON.parse(request.responseText) as CloudinaryResponse);
        return;
      }
      reject(new UploadError('فشل رفع الصورة. حاول مرة أخرى.'));
    });

    request.addEventListener('error', () =>
      reject(new UploadError('تعذّر الاتصال بخدمة رفع الصور.')),
    );

    request.send(body);
  });
}
