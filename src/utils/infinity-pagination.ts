import { IPaginationOptions } from './types/pagination-options';
import { InfinityPaginationResponseDto } from './dto/infinity-pagination-response.dto';

export const infinityPagination = <T extends { id: string }>(
  data: T[],
  options: IPaginationOptions,
): InfinityPaginationResponseDto<T> => {
  const nextCursor =
    data.length === options.limit && data.length > 0 ? data.at(-1)!.id : null;

  return {
    data,
    nextCursor,
  };
};
