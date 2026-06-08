import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { ChecklistService } from '../checklist/checklist.service';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateChecklistDto } from './dto/generate-checklist.dto';

type ItemCallback = (item: string, index: number) => void;

const prohibitedOutputPatterns = [
  /price target/i,
  /financial advice/i,
  /guaranteed profit/i,
  /enter (a )?(long|short)/i,
  /go (long|short)/i,
  /\b(buy|sell)\s+(BTC|ETH|SOL|AAPL|TSLA|NVDA|stock|crypto|coin|pair)\b/i,
  /\bsignal\b/i,
];

@Injectable()
export class AiService {
  private readonly gemini: GoogleGenAI;
  private readonly model: string;

  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly checklistService: ChecklistService,
  ) {
    const apiKey = configService.get<string>('GEMINI_API_KEY');
    this.model = configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    this.gemini = new GoogleGenAI({ apiKey });
  }

  async streamChecklist(userId: string, dto: GenerateChecklistDto, onItem: ItemCallback) {
    if (!process.env.GEMINI_API_KEY) {
      throw new InternalServerErrorException('GEMINI_API_KEY is not configured.');
    }

    const emitted: string[] = [];
    let pendingText = '';

    const stream = await this.gemini.models.generateContentStream({
      model: this.model,
      contents: this.buildPrompt(dto),
      config: {
        temperature: 0.35,
        systemInstruction:
          'You generate educational trading process checklists. You never provide buy/sell signals, price targets, asset recommendations, or financial advice.',
      },
    });

    for await (const chunk of stream) {
      pendingText += chunk.text ?? '';
      const parsed = this.extractCompleteItems(pendingText);
      pendingText = parsed.remainder;

      for (const item of parsed.items) {
        this.emitIfUsable(item, emitted, onItem);
      }
    }

    for (const item of this.parseItems(pendingText)) {
      this.emitIfUsable(item, emitted, onItem);
    }

    if (emitted.length === 0) {
      throw new BadRequestException('Gemini did not return checklist items.');
    }

    const finalItems = emitted.slice(0, 10);
    await this.persistProfileAndChecklist(userId, dto, finalItems);
    return finalItems;
  }

  private buildPrompt(dto: GenerateChecklistDto) {
    return `
Generate 6-10 short, clear, actionable checklist items for a trader.

Trader profile:
- Main trading goal: ${dto.primaryGoal}
- Market focus: ${dto.marketFocus}
- Experience level: ${dto.experienceLevel}
- Trading style: ${dto.tradingStyle}
- Biggest current blocker: ${dto.biggestChallenge}
- Current context: ${dto.tradingContext}
- Additional context: ${dto.additionalContext?.trim() || 'None'}

Rules:
- Return only one checklist item per line.
- Do not number the lines.
- Focus on routines, risk rules, journal process, review cadence, max-loss limits, setup validation, and behavior controls.
- Do not include buy/sell calls, asset recommendations, price targets, or financial advice.
- Keep each item under 110 characters.
`.trim();
  }

  private extractCompleteItems(text: string) {
    const lines = text.split(/\r?\n/);
    const remainder = lines.pop() ?? '';
    return {
      items: this.parseItems(lines.join('\n')),
      remainder,
    };
  }

  private parseItems(text: string) {
    return text
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
      .filter((line) => line.length > 0);
  }

  private emitIfUsable(item: string, emitted: string[], onItem: ItemCallback) {
    const cleanItem = item.replace(/^["']|["']$/g, '').trim();
    if (!cleanItem || emitted.includes(cleanItem)) {
      return;
    }

    if (prohibitedOutputPatterns.some((pattern) => pattern.test(cleanItem))) {
      return;
    }

    if (emitted.length >= 10) {
      return;
    }

    emitted.push(cleanItem);
    onItem(cleanItem, emitted.length - 1);
  }

  private async persistProfileAndChecklist(
    userId: string,
    dto: GenerateChecklistDto,
    items: string[],
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.onboardingProfile.upsert({
        where: { userId },
        create: {
          userId,
          primaryGoal: dto.primaryGoal,
          marketFocus: dto.marketFocus,
          experienceLevel: dto.experienceLevel,
          tradingStyle: dto.tradingStyle,
          biggestChallenge: dto.biggestChallenge,
          tradingContext: dto.tradingContext,
          additionalContext: dto.additionalContext?.trim() || null,
        },
        update: {
          primaryGoal: dto.primaryGoal,
          marketFocus: dto.marketFocus,
          experienceLevel: dto.experienceLevel,
          tradingStyle: dto.tradingStyle,
          biggestChallenge: dto.biggestChallenge,
          tradingContext: dto.tradingContext,
          additionalContext: dto.additionalContext?.trim() || null,
        },
      });

      await tx.checklistItem.deleteMany({ where: { userId } });
      await tx.checklistItem.createMany({
        data: items.map((text, index) => ({
          userId,
          text,
          position: index + 1,
        })),
      });

      await tx.user.update({
        where: { id: userId },
        data: { hasCompletedOnboarding: true },
      });
    });

    return this.checklistService.findForUser(userId);
  }
}
