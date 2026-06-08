import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChecklistService } from './checklist.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

@Controller('checklist')
@UseGuards(JwtAuthGuard)
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @Get()
  findMine(@CurrentUser() user: User) {
    return this.checklistService.findForUser(user.id);
  }

  @Post()
  replaceMine(@CurrentUser() user: User, @Body() dto: CreateChecklistDto) {
    return this.checklistService.replaceForUser(user.id, dto.items);
  }

  @Patch(':id')
  updateItem(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.checklistService.updateItem(user.id, id, dto.completed);
  }
}
