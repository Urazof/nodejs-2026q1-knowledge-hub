import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UserRole } from '../common/enums/user-role.enum';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { PaginatedResponse } from '../common/models/paginated-response.model';
import { PublicUser, User } from '../common/models/user.model';
import {
  paginateItems,
  shouldPaginate,
  sortItems,
} from '../common/utils/list-query.util';
import { sanitizeUser } from '../common/utils/sanitize-user';
import { InMemoryDbService } from '../storage/in-memory-db.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Injectable()
export class UserService {
  constructor(private readonly db: InMemoryDbService) {}

  findAllPublic(
    query: ListQueryDto = {},
  ): PublicUser[] | PaginatedResponse<PublicUser> {
    const users = this.db.users.map(sanitizeUser);
    const sorted = sortItems(users, query.sortBy, query.order ?? 'asc', [
      'id',
      'login',
      'role',
      'createdAt',
      'updatedAt',
    ]);

    if (shouldPaginate(query)) {
      return paginateItems(sorted, query.page ?? 1, query.limit ?? 10);
    }

    return sorted;
  }

  findOnePublic(id: string): PublicUser {
    return sanitizeUser(this.findOneOrThrow(id));
  }

  create(payload: CreateUserDto): PublicUser {
    const role = payload.role ?? UserRole.VIEWER;
    const now = Date.now();

    const user: User = {
      id: randomUUID(),
      login: payload.login,
      password: payload.password,
      role,
      createdAt: now,
      updatedAt: now,
    };

    this.db.users.push(user);
    return sanitizeUser(user);
  }

  updatePassword(id: string, payload: UpdatePasswordDto): PublicUser {
    const user = this.findOneOrThrow(id);

    if (user.password !== payload.oldPassword) {
      throw new ForbiddenException('oldPassword is wrong');
    }

    user.password = payload.newPassword;
    user.updatedAt = Date.now();

    return sanitizeUser(user);
  }

  remove(id: string): void {
    const user = this.findOneOrThrow(id);
    const index = this.db.users.findIndex((item) => item.id === user.id);
    this.db.users.splice(index, 1);

    this.db.articles.forEach((article) => {
      if (article.authorId === user.id) {
        article.authorId = null;
      }
    });

    const commentsToKeep = this.db.comments.filter(
      (comment) => comment.authorId !== user.id,
    );
    this.db.comments.splice(0, this.db.comments.length, ...commentsToKeep);
  }

  private findOneOrThrow(id: string): User {
    const user = this.db.users.find((item) => item.id === id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
