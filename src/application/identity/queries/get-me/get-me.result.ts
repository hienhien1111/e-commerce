import { NullableType } from '@/utils/types/nullable.type';
import { User } from '@/domain/entities/user';

export type GetMeResult = NullableType<User>;
