import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { User } from '@prisma/client';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: User) {
    return this.usersService.toPublicUser(user);
  }

  @Post('reset-onboarding')
  resetOnboarding(@CurrentUser() user: User) {
    return this.usersService.resetOnboarding(user.id);
  }
}
