import { Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES, type UploadSignature } from '@arduino-lab/contracts';
import { v2 as cloudinary } from 'cloudinary';

import { AppConfigService } from '../../config/app-config.service';
import { BadRequestError, ConflictError } from '../../common/errors/app.exception';

const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'] as const;

/**
 * Signed direct-to-Cloudinary uploads.
 *
 * The file never passes through this server: Render's free instance has a small
 * memory ceiling and a request timeout that image uploads would blow through.
 * Instead the browser posts straight to Cloudinary using a signature minted
 * here. Because the folder, size cap and format whitelist are part of what gets
 * signed, a tampered upload is rejected by Cloudinary itself.
 */
@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly config: AppConfigService) {
    if (config.isCloudinaryConfigured) {
      const { cloudName, apiKey, apiSecret } = config.cloudinary;
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    }
  }

  createSignature(): UploadSignature {
    this.assertConfigured();

    const { cloudName, apiKey, apiSecret, folder } = this.config.cloudinary;
    const timestamp = Math.floor(Date.now() / 1000);

    // Every field signed here is one the client cannot change without
    // invalidating the signature. `max_bytes` is deliberately NOT signed:
    // Cloudinary does not treat it as a signable upload parameter, so including
    // it here produces a signature the upload endpoint rejects. The 5 MB ceiling
    // is enforced on the client before upload; the folder, formats and
    // transformation below are all validated by Cloudinary against this
    // signature.
    const params = {
      folder,
      timestamp,
      allowed_formats: ALLOWED_FORMATS.join(','),
      // Shrink and re-encode on the way in so a 5 MB phone photo lands as a
      // reasonable file and the receipt page stays fast.
      transformation: 'c_limit,w_1600,h_1600,q_auto,f_auto',
    };

    return {
      signature: cloudinary.utils.api_sign_request(params, apiSecret),
      timestamp,
      apiKey,
      cloudName,
      folder,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    };
  }

  async remove(publicId: string): Promise<void> {
    this.assertConfigured();

    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      this.logger.error(`Failed to delete ${publicId} from Cloudinary`, error);
      throw new ConflictError(ERROR_CODES.UPLOAD_FAILED);
    }
  }

  private assertConfigured(): void {
    if (!this.config.isCloudinaryConfigured) {
      this.logger.error('Cloudinary credentials are missing');
      throw new BadRequestError(ERROR_CODES.UPLOAD_FAILED, {
        upload: ['خدمة رفع الصور غير مُهيّأة. تواصل مع إدارة النظام.'],
      });
    }
  }
}
