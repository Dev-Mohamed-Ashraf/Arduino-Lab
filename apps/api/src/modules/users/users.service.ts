import { Injectable } from '@nestjs/common';
import {
  ERROR_CODES,
  type CurrentUser,
  type ListUsersQuery,
  type Paginated,
  type UpdateProfileInput,
  type User,
} from '@arduino-lab/contracts';
import { Prisma, Role } from '@prisma/client';

import { BadRequestError } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { paginate, toPrismaPagination } from '../../common/utils/pagination';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListUsersQuery): Promise<Paginated<User>> {
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { studentCode: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        ...toPrismaPagination(query),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          studentCode: true,
          phone: true,
          role: true,
          emailVerifiedAt: true,
          isActive: true,
          createdAt: true,
          _count: { select: { ownedBookings: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(rows.map(toUserDto), total, query);
  }

  /**
   * Changes a user's role.
   *
   * An admin cannot demote themselves — that is the one change that could leave
   * the system with no administrator at all.
   */
  async updateRole(actorId: string, targetId: string, role: Role): Promise<User> {
    if (actorId === targetId && role !== Role.ADMIN) {
      throw new BadRequestError(ERROR_CODES.FORBIDDEN, {
        role: ['لا يمكنك تغيير دورك الخاص من مدير النظام.'],
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: {
        id: true,
        email: true,
        fullName: true,
        studentCode: true,
        phone: true,
        role: true,
        emailVerifiedAt: true,
        isActive: true,
        createdAt: true,
        _count: { select: { ownedBookings: true } },
      },
    });

    return toUserDto(updated);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<CurrentUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.fullName ? { fullName: input.fullName } : {}),
        ...(input.studentCode !== undefined ? { studentCode: input.studentCode || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        studentCode: true,
        phone: true,
        role: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });

    return {
      ...user,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}

type UserRow = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    fullName: true;
    studentCode: true;
    phone: true;
    role: true;
    emailVerifiedAt: true;
    isActive: true;
    createdAt: true;
    _count: { select: { ownedBookings: true } };
  };
}>;

function toUserDto(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    studentCode: row.studentCode,
    phone: row.phone,
    role: row.role,
    emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
    isActive: row.isActive,
    bookingsCount: row._count.ownedBookings,
    createdAt: row.createdAt.toISOString(),
  };
}
