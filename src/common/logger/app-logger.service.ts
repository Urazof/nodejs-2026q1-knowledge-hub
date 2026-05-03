import { ConsoleLogger, LogLevel } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

function resolveLogLevels(logLevel: string): LogLevel[] {
  const hierarchy: LogLevel[] = ['verbose', 'debug', 'log', 'warn', 'error'];
  const idx = hierarchy.indexOf(logLevel as LogLevel);
  // include all levels from the given level upward in severity
  return idx === -1 ? ['log', 'warn', 'error'] : hierarchy.slice(idx);
}

export class AppLogger extends ConsoleLogger {
  private readonly logFilePath: string;
  private readonly maxFileSizeBytes: number;
  private readonly isProduction: boolean;

  constructor() {
    const logLevel = process.env.LOG_LEVEL ?? 'log';
    super('App', { logLevels: resolveLogLevels(logLevel) });

    this.maxFileSizeBytes =
      Number(process.env.LOG_MAX_FILE_SIZE ?? 1024) * 1024;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logFilePath = path.join(process.cwd(), 'logs', 'app.log');
    this.ensureLogDir();
  }

  log(message: unknown, context?: string): void {
    super.log(message, context);
    this.writeToFile('LOG', message, context);
  }

  error(message: unknown, stack?: string, context?: string): void {
    super.error(message, stack, context);
    this.writeToFile('ERROR', message, context, stack);
  }

  warn(message: unknown, context?: string): void {
    super.warn(message, context);
    this.writeToFile('WARN', message, context);
  }

  debug(message: unknown, context?: string): void {
    super.debug(message, context);
    this.writeToFile('DEBUG', message, context);
  }

  verbose(message: unknown, context?: string): void {
    super.verbose(message, context);
    this.writeToFile('VERBOSE', message, context);
  }

  private writeToFile(
    level: string,
    message: unknown,
    context?: string,
    stack?: string,
  ): void {
    try {
      this.rotateIfNeeded();
      const line = this.isProduction
        ? this.formatJson(level, message, context, stack)
        : this.formatText(level, message, context, stack);
      fs.appendFileSync(this.logFilePath, line + '\n', 'utf8');
    } catch {
      // file logging failure must never crash the application
    }
  }

  private formatJson(
    level: string,
    message: unknown,
    context?: string,
    stack?: string,
  ): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      ...(stack ? { stack } : {}),
    });
  }

  private formatText(
    level: string,
    message: unknown,
    context?: string,
    stack?: string,
  ): string {
    const ts = new Date().toISOString();
    const ctx = context ? `[${context}] ` : '';
    const base = `${ts} ${level} ${ctx}${String(message)}`;
    return stack ? `${base}\n${stack}` : base;
  }

  private rotateIfNeeded(): void {
    if (!fs.existsSync(this.logFilePath)) return;
    const { size } = fs.statSync(this.logFilePath);
    if (size < this.maxFileSizeBytes) return;

    const ts = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const rotated = this.logFilePath.replace('app.log', `app-${ts}.log`);
    fs.renameSync(this.logFilePath, rotated);
  }

  private ensureLogDir(): void {
    const dir = path.dirname(this.logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
