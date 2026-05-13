---
to: src/infrastructure/persistence/repositories/prisma-<%= h.changeCase.kebab(sampleEntity) %>.repository.ts
---
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { <%= sampleEntity %>RepositoryPort } from '@/application/<%= name %>/ports/<%= h.changeCase.kebab(sampleEntity) %>/<%= h.changeCase.kebab(sampleEntity) %>.repository.port';
import { <%= sampleEntity %> } from '@/domain/entities/<%= h.changeCase.kebab(sampleEntity) %>';

// TODO: Add the <%= sampleEntity %> model to prisma/schema.prisma:
//
// model <%= sampleEntity %> {
//   id        String   @id @db.Uuid
//   name      String
//   createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
//   updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz
//
//   @@map("<%= h.changeCase.snake(h.inflection.pluralize(sampleEntity)) %>")
// }
//
// Then run: bunx prisma migrate dev --name add_<%= h.changeCase.snake(sampleEntity) %>

@Injectable()
export class Prisma<%= sampleEntity %>Repository
  implements <%= sampleEntity %>RepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findById(_id: string): Promise<<%= sampleEntity %> | null> {
    // const row = await this.prisma.<%= h.changeCase.camel(sampleEntity) %>.findUnique({ where: { id } });
    // return row ? <%= sampleEntity %>.reconstitute({ name: row.name }, row.id, row.createdAt, row.updatedAt) : null;
    throw new Error('Not implemented — add model to schema.prisma first');
  }

  async save(_entity: <%= sampleEntity %>): Promise<<%= sampleEntity %>> {
    // const data = { id: entity.id, name: entity.name };
    // await this.prisma.<%= h.changeCase.camel(sampleEntity) %>.upsert({
    //   where: { id: entity.id },
    //   create: data,
    //   update: data,
    // });
    // return entity;
    throw new Error('Not implemented — add model to schema.prisma first');
  }

  async remove(_id: string): Promise<void> {
    // await this.prisma.<%= h.changeCase.camel(sampleEntity) %>.delete({ where: { id } });
    throw new Error('Not implemented — add model to schema.prisma first');
  }
}
