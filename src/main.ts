import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppLogger } from './common/logger/app-logger.service';

async function gracefulShutdown(
  app: INestApplication,
  logger: AppLogger,
  signal: string,
): Promise<void> {
  logger.error(`${signal} received — initiating graceful shutdown`);
  await app.close();
  process.exit(1);
}

async function bootstrap(): Promise<void> {
  const logger = new AppLogger();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(logger);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Knowledge Hub API')
    .setDescription('REST API for users, articles, categories, and comments.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('doc', app, document);

  process.on('uncaughtException', (error: Error) => {
    logger.error(`uncaughtException: ${error.message}`, error.stack, 'Process');
    void gracefulShutdown(app, logger, 'uncaughtException');
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    logger.error(`unhandledRejection: ${message}`, stack, 'Process');
    void gracefulShutdown(app, logger, 'unhandledRejection');
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  logger.log(`Application is running on port ${port}`, 'Bootstrap');
}

void bootstrap();
