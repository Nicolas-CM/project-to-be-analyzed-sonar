import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudinaryService {
  private isConfigured: boolean = false;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('⚠️  Cloudinary credentials not found in environment variables. Image upload will be disabled.');
      this.isConfigured = false;
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    this.isConfigured = true;
  }

  private checkConfiguration() {
    if (!this.isConfigured) {
      throw new Error(
        'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.',
      );
    }
  }

  async uploadImageProfile(file: Express.Multer.File): Promise<string> {
    this.checkConfiguration();
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: 'image',
            folder: 'aromalife/profiles',
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
              { quality: 'auto:good' },
              { format: 'webp' },
            ],
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve(result.secure_url);
            } else {
              reject(new Error('No result from Cloudinary upload'));
            }
          },
        )
        .end(file.buffer);
    });
  }

  async uploadLabelImage(file: Express.Multer.File): Promise<string> {
    this.checkConfiguration();
    // Usar el servicio de Cloudinary pero con configuración específica para labels
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: 'image',
            folder: 'aromalife/labels',
            transformation: [
              { width: 800, height: 600, crop: 'fit' },
              { quality: 'auto:good' },
              { format: 'webp' },
            ],
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary label upload error:', error);
              reject(error);
            } else if (result) {
              console.log('Cloudinary label upload success:', {
                public_id: result.public_id,
                secure_url: result.secure_url,
                format: result.format,
                resource_type: result.resource_type,
              });
              resolve(result.secure_url);
            } else {
              console.error('Cloudinary label upload: No result returned');
              reject(new Error('No result from Cloudinary upload'));
            }
          },
        )
        .end(file.buffer);
    });
  }

  async uploadAudio(file: Express.Multer.File): Promise<string> {
    this.checkConfiguration();
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: 'video', // Cloudinary uses 'video' resource type for audio files
            folder: 'aromalife/audio',
            format: 'mp3', // Convert to mp3 for consistency
            transformation: [{ quality: 'auto:good' }, { audio_codec: 'mp3' }],
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary audio upload error:', error);
              reject(error);
            } else if (result) {
              console.log('Cloudinary audio upload success:', {
                public_id: result.public_id,
                secure_url: result.secure_url,
                format: result.format,
                resource_type: result.resource_type,
              });
              resolve(result.secure_url);
            } else {
              console.error('Cloudinary audio upload: No result returned');
              reject(new Error('No result from Cloudinary audio upload'));
            }
          },
        )
        .end(file.buffer);
    });
  }

  async uploadQRCode(buffer: Buffer, candleId: string): Promise<string> {
    this.checkConfiguration();
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: 'image',
            folder: 'aromalife/qr-codes',
            public_id: `qr-${candleId}`,
            format: 'png',
            transformation: [
              { width: 300, height: 300, crop: 'fit' },
              { quality: 'auto:good' },
            ],
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary QR upload error:', error);
              reject(error);
            } else if (result) {
              console.log('Cloudinary QR upload success:', {
                public_id: result.public_id,
                secure_url: result.secure_url,
                format: result.format,
                resource_type: result.resource_type,
              });
              resolve(result.secure_url);
            } else {
              console.error('Cloudinary QR upload: No result returned');
              reject(new Error('No result from Cloudinary QR upload'));
            }
          },
        )
        .end(buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    this.checkConfiguration();
    console.log(`🗑️ Attempting to delete image from Cloudinary: ${publicId}`);
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          console.error(
            `❌ Cloudinary image deletion failed for ${publicId}:`,
            error,
          );
          reject(error);
        } else {
          console.log(
            `✅ Cloudinary image deletion result for ${publicId}:`,
            result,
          );
          resolve();
        }
      });
    });
  }

  async deleteAudio(publicId: string): Promise<void> {
    this.checkConfiguration();
    console.log(`🗑️ Attempting to delete audio from Cloudinary: ${publicId}`);
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(
        publicId,
        { resource_type: 'video' },
        (error, result) => {
          if (error) {
            console.error(
              `❌ Cloudinary audio deletion failed for ${publicId}:`,
              error,
            );
            reject(error);
          } else {
            console.log(
              `✅ Cloudinary audio deletion result for ${publicId}:`,
              result,
            );
            resolve();
          }
        },
      );
    });
  }

  async upload3DModel(file: Express.Multer.File): Promise<string> {
    this.checkConfiguration();
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: 'raw', // For 3D model files
            folder: 'aromalife/models',
            public_id: `model-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            // Keep original format for 3D models
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary 3D model upload error:', error);
              reject(error);
            } else if (result) {
              console.log('Cloudinary 3D model upload success:', {
                public_id: result.public_id,
                secure_url: result.secure_url,
                format: result.format,
                resource_type: result.resource_type,
              });
              resolve(result.secure_url);
            } else {
              console.error('Cloudinary 3D model upload: No result returned');
              reject(new Error('No result from Cloudinary 3D model upload'));
            }
          },
        )
        .end(file.buffer);
    });
  }

  async delete3DModel(publicId: string): Promise<void> {
    console.log(
      `🗑️ Attempting to delete 3D model from Cloudinary: ${publicId}`,
    );
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(
        publicId,
        { resource_type: 'raw' },
        (error, result) => {
          if (error) {
            console.error(
              `❌ Cloudinary 3D model deletion failed for ${publicId}:`,
              error,
            );
            reject(error);
          } else {
            console.log(
              `✅ Cloudinary 3D model deletion result for ${publicId}:`,
              result,
            );
            resolve();
          }
        },
      );
    });
  }

  /**
   * Extrae el publicId de una URL de Cloudinary
   * @param url URL completa de Cloudinary
   * @returns publicId o null si no es una URL válida de Cloudinary
   */
  extractPublicId(url: string): string | null {
    try {
      console.log(`🔍 Extracting publicId from URL: ${url}`);

      // Ejemplo de URL: https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg
      // PublicId sería: sample

      if (!url || !url.includes('cloudinary.com')) {
        console.log('❌ URL is not a valid Cloudinary URL');
        return null;
      }

      // Dividir la URL por '/'
      const parts = url.split('/');
      console.log('🔍 URL parts:', parts);

      // Encontrar el índice de 'upload'
      const uploadIndex = parts.findIndex((part) => part === 'upload');
      console.log('🔍 Upload index:', uploadIndex);

      if (uploadIndex === -1 || uploadIndex + 2 >= parts.length) {
        console.log(
          '❌ Invalid URL structure - upload index not found or insufficient parts',
        );
        return null;
      }

      // El publicId está después de 'upload' y la versión (v1234567890)
      let publicIdPart = parts.slice(uploadIndex + 2).join('/');
      console.log('🔍 Public ID part before extension removal:', publicIdPart);

      // Remover la extensión del archivo
      const lastDotIndex = publicIdPart.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        publicIdPart = publicIdPart.substring(0, lastDotIndex);
      }

      console.log('✅ Extracted publicId:', publicIdPart);
      return publicIdPart;
    } catch (error) {
      console.error('❌ Error extracting publicId from URL:', error);
      return null;
    }
  }
}
