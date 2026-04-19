import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService, TokenPair } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SignupDto } from './dto/signup.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user.' })
  @ApiCreatedResponse({ description: 'User created successfully.' })
  @ApiBadRequestResponse({
    description: 'Invalid body or login already taken.',
  })
  signup(
    @Body() dto: SignupDto,
  ): Promise<{ id: string; login: string; role: string }> {
    return this.authService.signup(dto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive token pair.' })
  @ApiOkResponse({ description: 'Access and refresh tokens returned.' })
  @ApiBadRequestResponse({ description: 'Invalid body.' })
  @ApiForbiddenResponse({ description: 'Invalid credentials.' })
  login(@Body() dto: LoginDto): Promise<TokenPair> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh token pair.' })
  @ApiOkResponse({ description: 'New token pair returned.' })
  @ApiUnauthorizedResponse({ description: 'No refresh token provided.' })
  @ApiForbiddenResponse({ description: 'Refresh token is invalid or expired.' })
  refresh(@Body() dto: RefreshDto): Promise<TokenPair> {
    return this.authService.refresh(dto);
  }
}
