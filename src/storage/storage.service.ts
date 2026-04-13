import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

@Injectable()
export class StorageService {
  async uploadFile(key: string, buffer: Buffer, _mimeType: string): Promise<void> {
    const filePath = join(UPLOADS_DIR, ...key.split('/'));
    const dir = dirname(filePath);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(filePath, buffer);
  }

  async getPresignedUrl(key: string, _expiresIn?: number): Promise<string> {
    const base = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    return `${base}/uploads/${key}`;
  }
}
