import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.AWS_S3_BUCKET ?? '';

    this.client = new S3Client({
      region: process.env.AWS_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
        // Required for temporary credentials (AWS Academy / IAM roles)
        ...(process.env.AWS_SESSION_TOKEN && {
          sessionToken: process.env.AWS_SESSION_TOKEN,
        }),
      },
    });
  }

  async uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );
      this.logger.log(`Uploaded: s3://${this.bucket}/${key}`);
    } catch (error) {
      this.logger.error(`Failed to upload ${key}`, error);
      throw new InternalServerErrorException('File upload failed');
    }
  }

  async getPresignedUrl(key: string, expiresIn = 900): Promise<string> {
    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn },
      );
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for ${key}`, error);
      throw new InternalServerErrorException('Could not generate file URL');
    }
  }
}
