import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type PublicUser = Pick<
  User,
  'id' | 'name' | 'email' | 'hasCompletedOnboarding' | 'createdAt' | 'updatedAt'
>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: { name: string; email: string; passwordHash: string }) {
    return this.prisma.user.create({ data });
  }

  async resetOnboarding(userId: string) {
    const user = await this.prisma.$transaction(async (tx) => {
      await tx.checklistItem.deleteMany({ where: { userId } });
      await tx.onboardingProfile.deleteMany({ where: { userId } });

      return tx.user.update({
        where: { id: userId },
        data: { hasCompletedOnboarding: false },
      });
    });

    return this.toPublicUser(user);
  }

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
