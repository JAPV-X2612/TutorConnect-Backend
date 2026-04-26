# Tareas Pendientes de Infraestructura AWS — HU-02

Estas tareas requieren una cuenta AWS real y no pueden automatizarse en código.

## S3 — Bucket de certificaciones

- [ ] Crear bucket: `tutorconnect-certificaciones` (región: p.ej. `us-east-1`)
- [ ] Bloquear todo acceso público (**Block Public Access: ON**)
- [ ] Habilitar **versionado** del bucket
- [ ] Configurar política de ciclo de vida: mover objetos a **S3 Glacier** después de **365 días**

## IAM — Permisos para la aplicación

- [ ] Crear usuario IAM (o role para ECS/EC2) con los siguientes permisos sobre el bucket:
  - `s3:PutObject`
  - `s3:GetObject`
  - `s3:DeleteObject`
  - `s3:ListBucket`
- [ ] Guardar el **Access Key ID** y **Secret Access Key** generados de forma segura

## AWS Systems Manager — Parameter Store

Registrar los siguientes parámetros (tipo `SecureString` para credenciales):

| Parámetro | Variable en contenedor | Valor |
|---|---|---|
| `/tutorconnect/s3-bucket-name` | `S3_BUCKET_NAME` | `tutorconnect-certificaciones` |
| `/tutorconnect/s3-region` | `S3_REGION` | `us-east-1` (o la región elegida) |
| `/tutorconnect/aws-access-key-id` | `AWS_ACCESS_KEY_ID` | *(generado en paso IAM)* |
| `/tutorconnect/aws-secret-access-key` | `AWS_SECRET_ACCESS_KEY` | *(generado en paso IAM)* |

## StorageService — Integración S3 real

Una vez el bucket exista, reemplazar `src/storage/storage.service.ts` con implementación real usando el SDK de AWS:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

- `uploadFile(key, buffer, mimeType)` → `PutObjectCommand`
- `getPresignedUrl(key, expiresInSeconds)` → `getSignedUrl` con `GetObjectCommand`
- Leer variables de entorno: `S3_BUCKET_NAME`, `S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

## Variables de entorno a añadir en `.env`

```env
S3_BUCKET_NAME=tutorconnect-certificaciones
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```
