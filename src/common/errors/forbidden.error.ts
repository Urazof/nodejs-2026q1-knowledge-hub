import { AppError } from './app.error';

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
}
