import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChecklistService {
  constructor(private readonly prisma: PrismaService) {}

  findForUser(userId: string) {
    return this.prisma.checklistItem.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
    });
  }

  async replaceForUser(userId: string, rawItems: string[]) {
    const items = rawItems
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, 10);

    await this.prisma.$transaction([
      this.prisma.checklistItem.deleteMany({ where: { userId } }),
      this.prisma.checklistItem.createMany({
        data: items.map((text, index) => ({
          userId,
          text,
          position: index + 1,
        })),
      }),
    ]);

    return this.findForUser(userId);
  }

  async updateItem(userId: string, id: string, completed: boolean) {
    const result = await this.prisma.checklistItem.updateMany({
      where: { id, userId },
      data: { completed },
    });

    if (result.count === 0) {
      throw new NotFoundException('Checklist item not found.');
    }

    return this.prisma.checklistItem.findUniqueOrThrow({ where: { id } });
  }
}
