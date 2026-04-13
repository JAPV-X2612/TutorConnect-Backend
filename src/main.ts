import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  // Disable built-in body parser so we can control it per-route
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Serve static files from uploads/
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));

  // Raw body for Clerk webhook signature verification (must come first)
  app.use('/webhooks/clerk', express.raw({ type: 'application/json' }));

  // Standard body parsers for all other routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Automatic DTOs validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          return `${error.property}: ${Object.values(error.constraints || {}).join(', ')}`;
        });
        return new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors: messages,
        });
      },
    }),
  );

  await app.listen(process.env.PORT || 3000);
}
bootstrap(); // TODO: Fix warning
