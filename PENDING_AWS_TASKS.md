# Pending AWS Infrastructure Tasks

These tasks require a real AWS account and cannot be automated in code.

## S3 — Certifications bucket

- [ ] Create bucket: `tutorconnect-certificaciones` (region: `us-east-1`)
- [ ] Enable **Block Public Access** (all options ON)
- [ ] Enable bucket **versioning**
- [ ] Configure lifecycle rule: move objects to **S3 Glacier** after **365 days**

## IAM — Application permissions

- [ ] Create IAM user (or ECS task role) with the following permissions on the bucket:
  - `s3:PutObject`
  - `s3:GetObject`
  - `s3:DeleteObject`
  - `s3:ListBucket`
- [ ] Store the generated **Access Key ID** and **Secret Access Key** securely

## AWS Systems Manager — Parameter Store

Register the following parameters (type `SecureString` for credentials):

| Parameter                             | Container env var       | Value                          |
| ------------------------------------- | ----------------------- | ------------------------------ |
| `/tutorconnect/s3-bucket-name`        | `S3_BUCKET_NAME`        | `tutorconnect-certificaciones` |
| `/tutorconnect/s3-region`             | `S3_REGION`             | `us-east-1`                    |
| `/tutorconnect/aws-access-key-id`     | `AWS_ACCESS_KEY_ID`     | _(from IAM step)_              |
| `/tutorconnect/aws-secret-access-key` | `AWS_SECRET_ACCESS_KEY` | _(from IAM step)_              |

## StorageService — Real S3 integration

Once the bucket exists, update `src/storage/storage.service.ts` with the real implementation:

- `uploadFile(key, buffer, mimeType)` → `PutObjectCommand`
- `getPresignedUrl(key, expiresInSeconds)` → `getSignedUrl` + `GetObjectCommand`
- Read from env: `S3_BUCKET_NAME`, `S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

Required packages are already installed: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`.

## Environment variables to add to `.env`

```env
S3_BUCKET_NAME=tutorconnect-certificaciones
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```
