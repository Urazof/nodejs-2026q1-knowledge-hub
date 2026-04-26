import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  JwtUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PublicUser } from '../common/models/user.model';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { PaginatedResponse } from '../common/models/paginated-response.model';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UserService } from './user.service';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users.' })
  @ApiOkResponse({ description: 'Users returned.' })
  findAll(
    @Query() query: ListQueryDto,
  ): Promise<PublicUser[] | PaginatedResponse<PublicUser>> {
    return this.userService.findAllPublic(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id.' })
  @ApiOkResponse({ description: 'User returned.' })
  @ApiBadRequestResponse({ description: 'Invalid UUID.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<PublicUser> {
    return this.userService.findOnePublic(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create user.' })
  @ApiCreatedResponse({ description: 'User created.' })
  @ApiBadRequestResponse({ description: 'Invalid body.' })
  create(@Body() body: CreateUserDto): Promise<PublicUser> {
    return this.userService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user password.' })
  @ApiOkResponse({ description: 'Password updated.' })
  @ApiBadRequestResponse({ description: 'Invalid UUID or body.' })
  @ApiForbiddenResponse({
    description: 'Wrong oldPassword or insufficient permissions.',
  })
  @ApiNotFoundResponse({ description: 'User not found.' })
  updatePassword(
    @CurrentUser() currentUser: JwtUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdatePasswordDto,
  ): Promise<PublicUser> {
    if (currentUser.role !== 'admin' && currentUser.userId !== id) {
      throw new ForbiddenException('Access denied');
    }
    return this.userService.updatePassword(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete user.' })
  @ApiNoContentResponse({ description: 'User deleted.' })
  @ApiBadRequestResponse({ description: 'Invalid UUID.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    await this.userService.remove(id);
  }
}
