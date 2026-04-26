import { AppError } from './app.error';

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
}
