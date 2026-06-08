import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { GenerateChecklistDto } from './dto/generate-checklist.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-checklist')
  async generateChecklist(
    @CurrentUser() user: User,
    @Body() dto: GenerateChecklistDto,
    @Res() response: Response,
  ) {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders?.();

    try {
      const items = await this.aiService.streamChecklist(user.id, dto, (item, index) => {
        this.writeEvent(response, 'item', { index, text: item });
      });

      this.writeEvent(response, 'done', { count: items.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Checklist generation failed.';
      this.writeEvent(response, 'error', { message });
    } finally {
      response.end();
    }
  }

  private writeEvent(response: Response, event: string, payload: unknown) {
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}
