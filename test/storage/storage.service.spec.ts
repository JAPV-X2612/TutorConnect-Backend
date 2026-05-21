const mockSend = jest.fn();
const mockGetSignedUrl = jest.fn();
const mockCreatePresignedPost = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _cmd: 'PutObject' })),
  GetObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _cmd: 'GetObject' })),
}));

jest.mock('@aws-sdk/s3-presigned-post', () => ({
  createPresignedPost: (...args: any[]) => mockCreatePresignedPost(...args),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: any[]) => mockGetSignedUrl(...args),
}));

import { InternalServerErrorException } from '@nestjs/common';
import { StorageService } from '../../src/storage/storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StorageService();
  });

  // ── uploadFile ───────────────────────────────────────────────────────────────

  describe('uploadFile', () => {
    it('should send a PutObjectCommand and resolve without error', async () => {
      mockSend.mockResolvedValue({});

      await expect(
        service.uploadFile('certs/tutor-1/cert.pdf', Buffer.from('data'), 'application/pdf'),
      ).resolves.toBeUndefined();

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException when S3 send fails', async () => {
      mockSend.mockRejectedValue(new Error('S3 unreachable'));

      await expect(
        service.uploadFile('certs/tutor-1/cert.pdf', Buffer.from('data'), 'application/pdf'),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  // ── getPresignedUploadUrl ────────────────────────────────────────────────────

  describe('getPresignedUploadUrl', () => {
    it('should return url and fields from createPresignedPost', async () => {
      const expected = { url: 'https://s3.example.com/upload', fields: { 'Content-Type': 'application/pdf' } };
      mockCreatePresignedPost.mockResolvedValue(expected);

      const result = await service.getPresignedUploadUrl('certs/cert.pdf', 'application/pdf');

      expect(result).toEqual(expected);
      expect(mockCreatePresignedPost).toHaveBeenCalledTimes(1);
    });

    it('should use the provided expiresIn value', async () => {
      mockCreatePresignedPost.mockResolvedValue({ url: 'https://s3.example.com', fields: {} });

      await service.getPresignedUploadUrl('key.pdf', 'application/pdf', 600);

      const [, options] = mockCreatePresignedPost.mock.calls[0];
      expect(options.Expires).toBe(600);
    });

    it('should throw InternalServerErrorException when createPresignedPost fails', async () => {
      mockCreatePresignedPost.mockRejectedValue(new Error('AWS error'));

      await expect(
        service.getPresignedUploadUrl('key.pdf', 'application/pdf'),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  // ── getPresignedUrl ──────────────────────────────────────────────────────────

  describe('getPresignedUrl', () => {
    it('should return a presigned download URL', async () => {
      mockGetSignedUrl.mockResolvedValue('https://s3.example.com/signed-url');

      const result = await service.getPresignedUrl('certs/cert.pdf');

      expect(result).toBe('https://s3.example.com/signed-url');
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    });

    it('should pass a custom expiresIn to getSignedUrl', async () => {
      mockGetSignedUrl.mockResolvedValue('https://s3.example.com/signed-url');

      await service.getPresignedUrl('certs/cert.pdf', 1800);

      const [, , options] = mockGetSignedUrl.mock.calls[0];
      expect(options.expiresIn).toBe(1800);
    });

    it('should use the default expiresIn of 900 when not specified', async () => {
      mockGetSignedUrl.mockResolvedValue('https://s3.example.com/signed-url');

      await service.getPresignedUrl('certs/cert.pdf');

      const [, , options] = mockGetSignedUrl.mock.calls[0];
      expect(options.expiresIn).toBe(900);
    });

    it('should throw InternalServerErrorException when getSignedUrl fails', async () => {
      mockGetSignedUrl.mockRejectedValue(new Error('Signer error'));

      await expect(service.getPresignedUrl('certs/cert.pdf')).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });
  });
});
