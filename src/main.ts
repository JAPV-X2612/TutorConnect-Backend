import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import * as express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  // Disable built-in body parser so we can control it per-route
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Raw body for Clerk webhook signature verification (must come first)
  app.use('/webhooks/clerk', express.raw({ type: 'application/json' }));

  // Standard body parsers for all other routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Filtro global de excepciones
  app.useGlobalFilters(new HttpExceptionFilter());

  // Validación automática de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades no definidas en el DTO
      forbidNonWhitelisted: true, // Lanza error si hay propiedades extras
      transform: true, // Transforma los payloads a instancias de DTO
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
bootstrap();
