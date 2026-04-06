import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({ description: 'Current user password.' })
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @ApiProperty({ description: 'New user password.' })
  @IsString()
  @IsNotEmpty()
  newPassword!: string;
}
