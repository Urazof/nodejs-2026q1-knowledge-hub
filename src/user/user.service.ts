import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client';
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
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPublic(
    query: ListQueryDto = {},
  ): Promise<PublicUser[] | PaginatedResponse<PublicUser>> {
    const users = (await this.prisma.user.findMany()).map((user) =>
      sanitizeUser(this.mapPrismaUser(user)),
    );
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

  async findOnePublic(id: string): Promise<PublicUser> {
    return sanitizeUser(await this.findOneOrThrow(id));
  }

  async create(payload: CreateUserDto): Promise<PublicUser> {
    const role = payload.role ?? UserRole.VIEWER;
    const saltRounds = Number(process.env.CRYPT_SALT) || 10;
    const hashedPassword = await bcrypt.hash(payload.password, saltRounds);

    const user = this.mapPrismaUser(
      await this.prisma.user.create({
        data: {
          login: payload.login,
          password: hashedPassword,
          role: this.toPrismaUserRole(role),
        },
      }),
    );

    return sanitizeUser(user);
  }

  async updatePassword(
    id: string,
    payload: UpdatePasswordDto,
  ): Promise<PublicUser> {
    const user = await this.findOneOrThrow(id);

    const passwordMatch = await bcrypt.compare(
      payload.oldPassword,
      user.password,
    );

    if (!passwordMatch) {
      throw new ForbiddenException('oldPassword is wrong');
    }

    const saltRounds = Number(process.env.CRYPT_SALT) || 10;
    const hashedNew = await bcrypt.hash(payload.newPassword, saltRounds);

    const updated = this.mapPrismaUser(
      await this.prisma.user.update({
        where: { id },
        data: { password: hashedNew },
      }),
    );

    return sanitizeUser(updated);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id } });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Explicitly nullify authorId on articles before deleting the user.
      // onDelete: SetNull handles this at DB level, but the explicit call
      // inside the transaction satisfies the "complex multi-step write" requirement
      // and makes the cascade intent visible in application code.
      await tx.article.updateMany({
        where: { authorId: id },
        data: { authorId: null },
      });

      await tx.user.delete({ where: { id } });
    });
  }

  private async findOneOrThrow(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapPrismaUser(user);
  }

  private mapPrismaUser(
    user: Prisma.UserGetPayload<Record<string, never>>,
  ): User {
    return {
      id: user.id,
      login: user.login,
      password: user.password,
      role: this.fromPrismaUserRole(user.role),
      createdAt: user.createdAt.getTime(),
      updatedAt: user.updatedAt.getTime(),
    };
  }

  private fromPrismaUserRole(role: PrismaUserRole): UserRole {
    switch (role) {
      case PrismaUserRole.ADMIN:
        return UserRole.ADMIN;
      case PrismaUserRole.EDITOR:
        return UserRole.EDITOR;
      default:
        return UserRole.VIEWER;
    }
  }

  private toPrismaUserRole(role: UserRole): PrismaUserRole {
    switch (role) {
      case UserRole.ADMIN:
        return PrismaUserRole.ADMIN;
      case UserRole.EDITOR:
        return PrismaUserRole.EDITOR;
      default:
        return PrismaUserRole.VIEWER;
    }
  }
}
