import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { SignupDto } from '../../auth/dto/signup.dto';
import { CreateArticleDto } from '../../article/dto/create-article.dto';
import { CreateCommentDto } from '../../comment/dto/create-comment.dto';
import { UpdatePasswordDto } from '../../user/dto/update-password.dto';
import { UserRole } from '../enums/user-role.enum';
import { ArticleStatus } from '../enums/article-status.enum';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

async function hasErrors(
  cls: new () => object,
  plain: object,
): Promise<boolean> {
  const instance = plainToInstance(cls, plain);
  const errors = await validate(instance as object);
  return errors.length > 0;
}

describe('SignupDto', () => {
  it('passes with valid login and password', async () => {
    expect(
      await hasErrors(SignupDto, { login: 'alice', password: 'pass123' }),
    ).toBe(false);
  });

  it('fails when login is missing', async () => {
    expect(await hasErrors(SignupDto, { password: 'pass123' })).toBe(true);
  });

  it('fails when password is missing', async () => {
    expect(await hasErrors(SignupDto, { login: 'alice' })).toBe(true);
  });

  it('fails when login is empty string', async () => {
    expect(await hasErrors(SignupDto, { login: '', password: 'pass' })).toBe(
      true,
    );
  });

  it('fails when login is not a string', async () => {
    expect(await hasErrors(SignupDto, { login: 123, password: 'pass' })).toBe(
      true,
    );
  });
});

describe('CreateUserDto', () => {
  it('passes with login, password, and valid role', async () => {
    expect(
      await hasErrors(CreateUserDto, {
        login: 'alice',
        password: 'pass',
        role: UserRole.ADMIN,
      }),
    ).toBe(false);
  });

  it('passes without role (optional)', async () => {
    expect(
      await hasErrors(CreateUserDto, { login: 'alice', password: 'pass' }),
    ).toBe(false);
  });

  it('fails when role is invalid enum value', async () => {
    expect(
      await hasErrors(CreateUserDto, {
        login: 'alice',
        password: 'pass',
        role: 'superuser',
      }),
    ).toBe(true);
  });
});

describe('UpdatePasswordDto', () => {
  it('passes with valid old and new password', async () => {
    expect(
      await hasErrors(UpdatePasswordDto, {
        oldPassword: 'old',
        newPassword: 'new',
      }),
    ).toBe(false);
  });

  it('fails when oldPassword is missing', async () => {
    expect(await hasErrors(UpdatePasswordDto, { newPassword: 'new' })).toBe(
      true,
    );
  });

  it('fails when newPassword is empty', async () => {
    expect(
      await hasErrors(UpdatePasswordDto, {
        oldPassword: 'old',
        newPassword: '',
      }),
    ).toBe(true);
  });
});

describe('CreateArticleDto', () => {
  it('passes with minimal valid payload', async () => {
    expect(
      await hasErrors(CreateArticleDto, { title: 'T', content: 'C' }),
    ).toBe(false);
  });

  it('passes with valid status enum', async () => {
    expect(
      await hasErrors(CreateArticleDto, {
        title: 'T',
        content: 'C',
        status: ArticleStatus.PUBLISHED,
      }),
    ).toBe(false);
  });

  it('passes with valid UUID authorId', async () => {
    expect(
      await hasErrors(CreateArticleDto, {
        title: 'T',
        content: 'C',
        authorId: VALID_UUID,
      }),
    ).toBe(false);
  });

  it('fails when title is missing', async () => {
    expect(await hasErrors(CreateArticleDto, { content: 'C' })).toBe(true);
  });

  it('fails when status is invalid enum value', async () => {
    expect(
      await hasErrors(CreateArticleDto, {
        title: 'T',
        content: 'C',
        status: 'new',
      }),
    ).toBe(true);
  });

  it('fails when authorId is not a UUID', async () => {
    expect(
      await hasErrors(CreateArticleDto, {
        title: 'T',
        content: 'C',
        authorId: 'bad-id',
      }),
    ).toBe(true);
  });
});

describe('CreateCommentDto', () => {
  it('passes with valid content and articleId', async () => {
    expect(
      await hasErrors(CreateCommentDto, {
        content: 'Nice',
        articleId: VALID_UUID,
      }),
    ).toBe(false);
  });

  it('fails when articleId is not a UUID', async () => {
    expect(
      await hasErrors(CreateCommentDto, { content: 'Nice', articleId: 'bad' }),
    ).toBe(true);
  });

  it('fails when content is missing', async () => {
    expect(await hasErrors(CreateCommentDto, { articleId: VALID_UUID })).toBe(
      true,
    );
  });

  it('fails when authorId is not a UUID (non-null)', async () => {
    expect(
      await hasErrors(CreateCommentDto, {
        content: 'x',
        articleId: VALID_UUID,
        authorId: 'bad-id',
      }),
    ).toBe(true);
  });

  it('passes when authorId is null (explicitly nullable)', async () => {
    expect(
      await hasErrors(CreateCommentDto, {
        content: 'x',
        articleId: VALID_UUID,
        authorId: null,
      }),
    ).toBe(false);
  });
});
