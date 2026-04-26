import { describe, it, expect } from 'vitest';
import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('ParseUUIDPipe', () => {
  let pipe: ParseUUIDPipe;

  beforeEach(() => {
    pipe = new ParseUUIDPipe({ version: '4' });
  });

  it('passes a valid UUID v4 through unchanged', async () => {
    const result = await pipe.transform(VALID_UUID, { type: 'param' });
    expect(result).toBe(VALID_UUID);
  });

  it('throws BadRequestException for a plain string', async () => {
    await expect(
      pipe.transform('not-a-uuid', { type: 'param' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for an empty string', async () => {
    await expect(pipe.transform('', { type: 'param' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for a UUID v1 when version is 4', async () => {
    const uuidV1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    await expect(pipe.transform(uuidV1, { type: 'param' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for a numeric string', async () => {
    await expect(pipe.transform('12345', { type: 'param' })).rejects.toThrow(
      BadRequestException,
    );
  });
});
