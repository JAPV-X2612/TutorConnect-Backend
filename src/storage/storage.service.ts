import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

@Injectable()
export class StorageService {
  uploadFile(key: string, buffer: Buffer, _mimeType: string): void {
    // TODO: Fix error
    const filePath = join(UPLOADS_DIR, ...key.split('/'));
    const dir = dirname(filePath);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(filePath, buffer);
  }

  getPresignedUrl(key: string, _expiresIn?: number): string {
    // TODO: Fix error
    const base =
      process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    return `${base}/uploads/${key}`;
  }
}
