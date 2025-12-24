import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressAdapter } from '@nestjs/platform-express';

async function bootstrap() {
  const { HttpAdapterHost } = require('@nestjs/core');
  const { PrismaClientExceptionFilter } = require('./prisma-client-exception.filter');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter());
  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
