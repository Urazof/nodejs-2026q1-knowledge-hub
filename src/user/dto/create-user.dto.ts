import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class CreateUserDto {
  @ApiProperty({ description: 'Unique login.' })
  @IsString()
  @IsNotEmpty()
  login!: string;

  @ApiProperty({ description: 'User password.' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({
    enum: UserRole,
    description: 'User role, defaults to viewer.',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
