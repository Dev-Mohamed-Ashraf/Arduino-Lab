import type { Paginated, PaginationQuery } from '@arduino-lab/contracts';

/** Translates a validated page/pageSize pair into Prisma's skip/take. */
export function toPrismaPagination({ page, pageSize }: PaginationQuery) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function paginate<T>(items: T[], total: number, query: PaginationQuery): Paginated<T> {
  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}
