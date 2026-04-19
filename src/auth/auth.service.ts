import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SignupDto } from './dto/signup.dto';

export interface TokenPayload {
  userId: string;
  login: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly tokenBlacklist = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(
    dto: SignupDto,
  ): Promise<{ id: string; login: string; role: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });

    if (existing) {
      throw new BadRequestException('Login is already taken');
    }

    const saltRounds = Number(process.env.CRYPT_SALT) || 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        login: dto.login,
        password: hashedPassword,
        role: PrismaUserRole.VIEWER,
      },
    });

    return {
      id: user.id,
      login: user.login,
      role: user.role.toLowerCase(),
    };
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });

    if (!user) {
      throw new ForbiddenException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatch) {
      throw new ForbiddenException('Invalid credentials');
    }

    return this.generateTokenPair({
      userId: user.id,
      login: user.login,
      role: user.role.toLowerCase(),
    });
  }

  async refresh(dto: RefreshDto): Promise<TokenPair> {
    if (!dto.refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    if (this.tokenBlacklist.has(dto.refreshToken)) {
      throw new ForbiddenException('Refresh token has been invalidated');
    }

    let payload: TokenPayload;

    try {
      payload = this.jwtService.verify<TokenPayload>(dto.refreshToken, {
        secret: process.env.JWT_SECRET_REFRESH_KEY,
      });
    } catch {
      throw new ForbiddenException('Refresh token is invalid or expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    return this.generateTokenPair({
      userId: user.id,
      login: user.login,
      role: user.role.toLowerCase(),
    });
  }

  logout(dto: LogoutDto): void {
    if (dto.refreshToken) {
      this.tokenBlacklist.add(dto.refreshToken);
    }
  }

  private generateTokenPair(payload: TokenPayload): TokenPair {
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET_KEY,
      expiresIn: process.env.TOKEN_EXPIRE_TIME ?? '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET_REFRESH_KEY,
      expiresIn: process.env.TOKEN_REFRESH_EXPIRE_TIME ?? '24h',
    });

    return { accessToken, refreshToken };
  }
}
