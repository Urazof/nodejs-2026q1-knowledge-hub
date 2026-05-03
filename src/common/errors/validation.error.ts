import { AppError } from './app.error';

export class ValidationError extends AppError {
  readonly statusCode = 400;
}
