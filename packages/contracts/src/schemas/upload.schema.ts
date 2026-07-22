import { z } from 'zod';

/**
 * Parameters the browser must send to Cloudinary verbatim alongside the file.
 * Changing any of them invalidates the signature, which is what keeps uploads
 * constrained to the folder, size and formats the API allows.
 */
export const uploadSignatureSchema = z.object({
  signature: z.string(),
  timestamp: z.number().int(),
  apiKey: z.string(),
  cloudName: z.string(),
  folder: z.string(),
  uploadUrl: z.string().url(),
});

export const uploadResultSchema = z.object({
  secureUrl: z.string().url(),
  publicId: z.string(),
  bytes: z.number().int(),
  format: z.string(),
});

export type UploadSignature = z.infer<typeof uploadSignatureSchema>;
export type UploadResult = z.infer<typeof uploadResultSchema>;
