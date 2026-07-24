import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ProductStatus,
  ProductVariantStatus,
} from '@/generated/prisma/client';
import type { CatalogV2RepositoryPort } from '@/application/catalog-v2/ports/catalog-v2.repository.port';
import type {
  CatalogOptionInput,
  CatalogProductStatus,
  CatalogV2Filters,
  CatalogV2Media,
  CatalogV2Product,
  CatalogV2ProductPage,
  CatalogV2Variant,
  CatalogVariantInput,
  CreateCatalogProductInput,
  InventoryAdjustmentInput,
  InventoryBalanceView,
  UpdateCatalogProductInput,
} from '@/application/catalog-v2/types/catalog-v2.types';
import { ApplicationError } from '@/application/shared/errors/application.error';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { slugify } from '@/utils/slugify';
import { generateUuidV7 } from '@/utils/uuid-v7';

const DEFAULT_WAREHOUSE_CODE = 'DEFAULT';

const PRODUCT_V2_INCLUDE = {
  catalogProjection: true,
  media: {
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
  },
  options: {
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    include: { values: { orderBy: [{ position: 'asc' }, { id: 'asc' }] } },
  },
  variants: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: {
      optionValues: { select: { valueId: true } },
      media: {
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        include: { media: true },
      },
      inventoryBalances: {
        where: { warehouse: { code: DEFAULT_WAREHOUSE_CODE } },
        include: { warehouse: { select: { code: true } } },
      },
    },
  },
} as const satisfies Prisma.ProductInclude;

type DbClient = Prisma.TransactionClient | PrismaService;
type ProductWithV2Relations = Prisma.ProductGetPayload<{
  include: typeof PRODUCT_V2_INCLUDE;
}>;

@Injectable()
export class PrismaCatalogV2Repository implements CatalogV2RepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCatalogProductInput): Promise<CatalogV2Product> {
    try {
      const prepared = this.prepareCreate(input);
      return await this.prisma.$transaction(async (tx) => {
        await this.assertCategory(tx, prepared.categoryId);
        await this.assertAvailableSlug(tx, prepared.slug);
        await this.assertAvailableSkus(
          tx,
          prepared.variants.map((item) => item.sku),
        );

        const productId = generateUuidV7();
        const product = await tx.product.create({
          data: {
            id: productId,
            name: prepared.name,
            slug: prepared.slug,
            description: prepared.description,
            // Legacy bridge values: catalog v2 never reads these fields.
            price: Math.min(...prepared.variants.map((item) => item.price)),
            comparePrice: null,
            stock: prepared.variants.reduce(
              (sum, variant) => sum + variant.initialStock,
              0,
            ),
            sku: null,
            categoryId: prepared.categoryId,
            isActive: prepared.status === 'ACTIVE',
            status: prepared.status as ProductStatus,
            publishedAt: prepared.status === 'ACTIVE' ? new Date() : null,
          },
        });

        const optionValues = await this.createOptions(
          tx,
          productId,
          prepared.options,
        );
        const mediaIds = await this.createMedia(tx, productId, prepared.media);
        const warehouse = await this.defaultWarehouse(tx);
        for (const variantInput of prepared.variants) {
          const variantId = generateUuidV7();
          const valueIds = this.resolveValueIds(
            variantInput,
            optionValues,
            prepared.options.length,
          );
          const combinationKey = this.combinationKey(valueIds);
          const status = variantInput.status as ProductVariantStatus;
          await tx.productVariant.create({
            data: {
              id: variantId,
              productId,
              label: null,
              sku: variantInput.sku,
              price: variantInput.price,
              comparePrice: variantInput.comparePrice,
              stock: variantInput.initialStock,
              isActive: status === 'ACTIVE',
              imageId: null,
              status,
              combinationKey,
              currency: 'VND',
            },
          });
          if (valueIds.length > 0) {
            await tx.productVariantOptionValue.createMany({
              data: valueIds.map((valueId) => ({
                variantId,
                productId,
                optionId: optionValues.byValueId.get(valueId)!.optionId,
                valueId,
              })),
            });
          }
          await tx.inventoryBalance.create({
            data: {
              warehouseId: warehouse.id,
              variantId,
              onHand: variantInput.initialStock,
              reserved: 0,
            },
          });
          if (variantInput.initialStock > 0) {
            await tx.inventoryMovement.create({
              data: {
                id: generateUuidV7(),
                eventId: `catalog-v2-opening:${variantId}`,
                warehouseId: warehouse.id,
                variantId,
                type: 'OPENING_BALANCE',
                quantity: variantInput.initialStock,
                note: 'Catalog V2 initial inventory',
              },
            });
          }
          const requestedMedia = variantInput.mediaIds ?? [];
          this.assertRequestedMedia(requestedMedia, mediaIds);
          if (requestedMedia.length > 0) {
            await tx.productVariantMedia.createMany({
              data: requestedMedia.map((mediaId, index) => ({
                variantId,
                productId,
                mediaId,
                isPrimary: index === 0,
                sortOrder: index,
              })),
            });
          }
        }
        await this.refreshProjectionInTransaction(tx, product.id);
        return this.getById(tx, product.id, false);
      });
    } catch (error) {
      this.throwCatalogPersistenceError(error);
    }
  }

  async update(
    id: string,
    input: UpdateCatalogProductInput,
  ): Promise<CatalogV2Product> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.product.findUnique({
          where: { id },
          include: PRODUCT_V2_INCLUDE,
        });
        if (!existing || existing.deletedAt) this.productNotFound();

        const metadata = this.prepareUpdate(input, existing);
        await this.assertCategory(tx, metadata.categoryId);
        if (metadata.slug !== existing.slug) {
          await this.assertAvailableSlug(tx, metadata.slug, id);
        }
        await tx.product.update({
          where: { id },
          data: {
            name: metadata.name,
            slug: metadata.slug,
            description: metadata.description,
            categoryId: metadata.categoryId,
            status: metadata.status as ProductStatus,
            isActive: metadata.status === 'ACTIVE',
            publishedAt:
              metadata.status === 'ACTIVE'
                ? (existing.publishedAt ?? new Date())
                : existing.publishedAt,
          },
        });

        if (input.media) {
          await tx.productVariantMedia.deleteMany({ where: { productId: id } });
          await tx.productMedia.deleteMany({ where: { productId: id } });
          await this.createMedia(tx, id, this.normaliseMedia(input.media));
        }

        if (input.options || input.variants) {
          if (!input.variants) {
            throw new ApplicationError(
              'CATALOG_VARIANTS_REQUIRED',
              'Replacing product options requires the complete variant list',
              'UNPROCESSABLE',
            );
          }
          await this.replaceTopology(tx, existing, input);
        }

        await this.refreshProjectionInTransaction(tx, id);
        return this.getById(tx, id, false);
      });
    } catch (error) {
      this.throwCatalogPersistenceError(error);
    }
  }

  async findPublicById(id: string): Promise<CatalogV2Product | null> {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null, status: 'ACTIVE' },
      include: PRODUCT_V2_INCLUDE,
    });
    return product ? this.toProduct(product) : null;
  }

  async findAdminById(id: string): Promise<CatalogV2Product | null> {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: PRODUCT_V2_INCLUDE,
    });
    return product ? this.toProduct(product) : null;
  }

  async findPublicPage(input: {
    filters: CatalogV2Filters;
    cursor: string | null;
    limit: number;
  }): Promise<CatalogV2ProductPage> {
    const cursor = this.decodeCursor(input.cursor);
    const optionClauses = (input.filters.optionValueIds ?? []).map(
      (valueId) => ({
        product: {
          variants: {
            some: { optionValues: { some: { valueId } } },
          },
        },
      }),
    );
    const rows = await this.prisma.productCatalogProjection.findMany({
      where: {
        status: 'ACTIVE',
        product: { deletedAt: null, status: 'ACTIVE' },
        ...(input.filters.categoryId
          ? { categoryId: input.filters.categoryId }
          : {}),
        ...(input.filters.search
          ? {
              searchText: {
                contains: input.filters.search.trim().toLowerCase(),
                mode: 'insensitive',
              },
            }
          : {}),
        ...(input.filters.minPrice !== undefined
          ? { priceMax: { gte: input.filters.minPrice } }
          : {}),
        ...(input.filters.maxPrice !== undefined
          ? { priceMin: { lte: input.filters.maxPrice } }
          : {}),
        ...(input.filters.inStock ? { availableQuantity: { gt: 0 } } : {}),
        ...(cursor
          ? {
              OR: [
                { publishedAt: { lt: cursor.publishedAt } },
                {
                  publishedAt: cursor.publishedAt,
                  productId: { lt: cursor.productId },
                },
              ],
            }
          : {}),
        ...(optionClauses.length > 0 ? { AND: optionClauses } : {}),
      },
      orderBy: [{ publishedAt: 'desc' }, { productId: 'desc' }],
      take: input.limit + 1,
      include: { product: { include: PRODUCT_V2_INCLUDE } },
    });
    const hasNext = rows.length > input.limit;
    const pageRows = rows.slice(0, input.limit);
    const last = pageRows.at(-1);
    return {
      data: pageRows.map((row) => this.toProduct(row.product)),
      nextCursor:
        hasNext && last
          ? this.encodeCursor({
              productId: last.productId,
              publishedAt: last.publishedAt,
            })
          : null,
    };
  }

  async adjustInventory(
    input: InventoryAdjustmentInput,
  ): Promise<InventoryBalanceView> {
    if (!Number.isInteger(input.quantityDelta) || input.quantityDelta === 0) {
      throw new ApplicationError(
        'INVENTORY_ADJUSTMENT_INVALID',
        'Inventory adjustment must be a non-zero integer',
        'UNPROCESSABLE',
      );
    }
    const eventId = input.idempotencyKey?.trim() || generateUuidV7();
    try {
      return await this.prisma.$transaction(async (tx) => {
        // The unique movement event is the durable idempotency key. Lock its
        // hash before checking so concurrent retries cannot both observe a miss.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${eventId}))`;
        const warehouse = await tx.warehouse.findUnique({
          where: {
            code:
              input.warehouseCode?.trim().toUpperCase() ||
              DEFAULT_WAREHOUSE_CODE,
          },
        });
        if (!warehouse) {
          throw new ApplicationError(
            'WAREHOUSE_NOT_FOUND',
            'Warehouse not found',
            'NOT_FOUND',
          );
        }
        const variant = await tx.productVariant.findFirst({
          where: { id: input.variantId, deletedAt: null },
          select: { id: true, productId: true },
        });
        if (!variant) {
          throw new ApplicationError(
            'VARIANT_NOT_FOUND',
            'Product variant not found',
            'NOT_FOUND',
          );
        }
        const previous = await tx.inventoryMovement.findUnique({
          where: { eventId },
        });
        if (previous) return this.balanceView(tx, warehouse.code, variant.id);

        await tx.inventoryBalance.upsert({
          where: {
            warehouseId_variantId: {
              warehouseId: warehouse.id,
              variantId: variant.id,
            },
          },
          create: { warehouseId: warehouse.id, variantId: variant.id },
          update: {},
        });
        await tx.$queryRaw`SELECT "variant_id" FROM "inventory_balances" WHERE "warehouse_id" = ${warehouse.id}::uuid AND "variant_id" = ${variant.id}::uuid FOR UPDATE`;
        const balance = await tx.inventoryBalance.findUniqueOrThrow({
          where: {
            warehouseId_variantId: {
              warehouseId: warehouse.id,
              variantId: variant.id,
            },
          },
        });
        if (balance.onHand + input.quantityDelta < balance.reserved) {
          throw new ApplicationError(
            'INVENTORY_ADJUSTMENT_INSUFFICIENT',
            'Adjustment would reduce on-hand stock below reserved stock',
            'CONFLICT',
          );
        }
        await tx.inventoryBalance.update({
          where: {
            warehouseId_variantId: {
              warehouseId: warehouse.id,
              variantId: variant.id,
            },
          },
          data: { onHand: { increment: input.quantityDelta } },
        });
        await tx.inventoryMovement.create({
          data: {
            id: generateUuidV7(),
            eventId,
            warehouseId: warehouse.id,
            variantId: variant.id,
            type: 'ADJUSTMENT',
            quantity: input.quantityDelta,
            note: input.reason.trim(),
          },
        });
        await this.refreshProjectionInTransaction(tx, variant.productId);
        return this.balanceView(tx, warehouse.code, variant.id);
      });
    } catch (error) {
      this.throwCatalogPersistenceError(error);
    }
  }

  async refreshProjection(productId: string): Promise<void> {
    await this.prisma.$transaction((tx) =>
      this.refreshProjectionInTransaction(tx, productId),
    );
  }

  private async replaceTopology(
    tx: Prisma.TransactionClient,
    existing: ProductWithV2Relations,
    input: UpdateCatalogProductInput,
  ): Promise<void> {
    const productId = existing.id;
    const currentVariants = new Map(
      existing.variants.map((item) => [item.id, item]),
    );
    const mediaIds = new Set(
      (
        await tx.productMedia.findMany({
          where: { productId },
          select: { id: true },
        })
      ).map((item) => item.id),
    );
    let optionValues = this.optionValueLookup(existing.options);
    if (input.options) {
      await tx.productVariantOptionValue.deleteMany({ where: { productId } });
      await tx.productOption.deleteMany({ where: { productId } });
      optionValues = await this.createOptions(
        tx,
        productId,
        this.normaliseOptions(input.options),
      );
    }
    const optionsCount = await tx.productOption.count({ where: { productId } });
    const received = new Set<string>();
    for (const rawVariant of input.variants ?? []) {
      const variantInput = this.normaliseVariant(rawVariant);
      const current = rawVariant.id
        ? currentVariants.get(rawVariant.id)
        : undefined;
      if (rawVariant.id && !current) {
        throw new ApplicationError(
          'VARIANT_NOT_FOUND',
          'A variant does not belong to this product',
          'NOT_FOUND',
        );
      }
      if (current && current.sku !== variantInput.sku) {
        throw new ApplicationError(
          'SKU_IMMUTABLE',
          'SKU cannot be changed after a variant is created',
          'UNPROCESSABLE',
        );
      }
      if (!current) await this.assertAvailableSkus(tx, [variantInput.sku]);
      const valueIds = this.resolveValueIds(
        variantInput,
        optionValues,
        optionsCount,
      );
      const combinationKey = this.combinationKey(valueIds);
      const status = variantInput.status as ProductVariantStatus;
      const variantId = current?.id ?? generateUuidV7();
      received.add(variantId);
      if (current) {
        if (variantInput.initialStock > 0) {
          throw new ApplicationError(
            'INVENTORY_ADJUSTMENT_REQUIRED',
            'Use the inventory adjustment endpoint for an existing variant',
            'UNPROCESSABLE',
          );
        }
        await tx.productVariant.update({
          where: { id: variantId },
          data: {
            price: variantInput.price,
            comparePrice: variantInput.comparePrice,
            status,
            isActive: status === 'ACTIVE',
            combinationKey,
            deletedAt: status === 'ARCHIVED' ? new Date() : null,
          },
        });
        await tx.productVariantOptionValue.deleteMany({ where: { variantId } });
      } else {
        await tx.productVariant.create({
          data: {
            id: variantId,
            productId,
            label: null,
            sku: variantInput.sku,
            price: variantInput.price,
            comparePrice: variantInput.comparePrice,
            stock: variantInput.initialStock,
            isActive: status === 'ACTIVE',
            imageId: null,
            status,
            combinationKey,
            currency: 'VND',
          },
        });
        const warehouse = await this.defaultWarehouse(tx);
        await tx.inventoryBalance.create({
          data: {
            warehouseId: warehouse.id,
            variantId,
            onHand: variantInput.initialStock,
          },
        });
        if (variantInput.initialStock > 0) {
          await tx.inventoryMovement.create({
            data: {
              id: generateUuidV7(),
              eventId: `catalog-v2-opening:${variantId}`,
              warehouseId: warehouse.id,
              variantId,
              type: 'OPENING_BALANCE',
              quantity: variantInput.initialStock,
              note: 'Catalog V2 initial inventory',
            },
          });
        }
      }
      if (valueIds.length > 0) {
        await tx.productVariantOptionValue.createMany({
          data: valueIds.map((valueId) => ({
            variantId,
            productId,
            optionId: optionValues.byValueId.get(valueId)!.optionId,
            valueId,
          })),
        });
      }
      const requestedMedia = variantInput.mediaIds ?? [];
      this.assertRequestedMedia(requestedMedia, mediaIds);
      await tx.productVariantMedia.deleteMany({ where: { variantId } });
      if (requestedMedia.length > 0) {
        await tx.productVariantMedia.createMany({
          data: requestedMedia.map((mediaId, index) => ({
            variantId,
            productId,
            mediaId,
            isPrimary: index === 0,
            sortOrder: index,
          })),
        });
      }
    }
    const retired = [...currentVariants.values()].filter(
      (variant) => !received.has(variant.id),
    );
    if (retired.length > 0) {
      await tx.productVariant.updateMany({
        where: { id: { in: retired.map((item) => item.id) } },
        data: {
          status: 'ARCHIVED',
          isActive: false,
          deletedAt: new Date(),
        },
      });
    }
  }

  private async createOptions(
    tx: Prisma.TransactionClient,
    productId: string,
    options: CatalogOptionInput[],
  ): Promise<ReturnType<PrismaCatalogV2Repository['emptyOptionLookup']>> {
    const lookup = this.emptyOptionLookup();
    for (const option of options) {
      const optionId = option.id ?? generateUuidV7();
      await tx.productOption.create({
        data: {
          id: optionId,
          productId,
          code: option.code,
          name: option.name,
          position: option.position ?? 0,
        },
      });
      for (const value of option.values) {
        const valueId = value.id ?? generateUuidV7();
        await tx.productOptionValue.create({
          data: {
            id: valueId,
            productOptionId: optionId,
            code: value.code,
            label: value.label,
            position: value.position ?? 0,
          },
        });
        lookup.byReference.set(`${option.code}:${value.code}`, valueId);
        lookup.byValueId.set(valueId, { optionId });
      }
    }
    return lookup;
  }

  private optionValueLookup(options: ProductWithV2Relations['options']) {
    const lookup = this.emptyOptionLookup();
    for (const option of options) {
      for (const value of option.values) {
        lookup.byReference.set(`${option.code}:${value.code}`, value.id);
        lookup.byValueId.set(value.id, { optionId: option.id });
      }
    }
    return lookup;
  }

  private emptyOptionLookup() {
    return {
      byReference: new Map<string, string>(),
      byValueId: new Map<string, { optionId: string }>(),
    };
  }

  private resolveValueIds(
    variant: ReturnType<PrismaCatalogV2Repository['normaliseVariant']>,
    lookup: ReturnType<PrismaCatalogV2Repository['emptyOptionLookup']>,
    optionCount: number,
  ): string[] {
    const ids = variant.optionValueIds?.length
      ? variant.optionValueIds
      : (variant.optionValueRefs ?? []).map((ref) => {
          const id = lookup.byReference.get(
            `${ref.optionCode}:${ref.valueCode}`,
          );
          if (!id) {
            throw new ApplicationError(
              'OPTION_VALUE_NOT_FOUND',
              'Variant references an option value outside this product',
              'UNPROCESSABLE',
            );
          }
          return id;
        });
    if (new Set(ids).size !== ids.length || ids.length !== optionCount) {
      throw new ApplicationError(
        'VARIANT_OPTION_COMBINATION_INVALID',
        'Variant must select exactly one value for every product option',
        'UNPROCESSABLE',
      );
    }
    const optionIds = ids.map((id) => lookup.byValueId.get(id)?.optionId);
    if (
      optionIds.some((id) => !id) ||
      new Set(optionIds).size !== optionCount
    ) {
      throw new ApplicationError(
        'VARIANT_OPTION_COMBINATION_INVALID',
        'Variant option values must belong to distinct options on this product',
        'UNPROCESSABLE',
      );
    }
    return [...ids].sort();
  }

  private combinationKey(valueIds: string[]): string {
    return valueIds.length === 0 ? 'DEFAULT' : `OPT:${valueIds.join('|')}`;
  }

  private prepareCreate(input: CreateCatalogProductInput) {
    const name = input.name.trim();
    const slug = (input.slug?.trim() || slugify(name)).toLowerCase();
    if (!name || !slug) {
      throw new ApplicationError(
        'PRODUCT_INVALID',
        'Product name must produce a slug',
        'UNPROCESSABLE',
      );
    }
    const status = input.status ?? 'DRAFT';
    const options = this.normaliseOptions(input.options ?? []);
    const variants = input.variants.map((variant) =>
      this.normaliseVariant(variant),
    );
    if (variants.length === 0) {
      throw new ApplicationError(
        'PRODUCT_VARIANT_REQUIRED',
        'A product requires at least one variant',
        'UNPROCESSABLE',
      );
    }
    if (
      status === 'ACTIVE' &&
      variants.every((item) => item.status !== 'ACTIVE')
    ) {
      throw new ApplicationError(
        'PRODUCT_ACTIVE_VARIANT_REQUIRED',
        'An active product requires an active variant',
        'UNPROCESSABLE',
      );
    }
    return {
      name,
      slug,
      description: input.description?.trim() || null,
      categoryId: input.categoryId ?? null,
      status,
      options,
      media: this.normaliseMedia(input.media ?? []),
      variants,
    };
  }

  private prepareUpdate(
    input: UpdateCatalogProductInput,
    existing: ProductWithV2Relations,
  ) {
    const name = input.name?.trim() || existing.name;
    const slug = (
      input.slug?.trim() || (input.name ? slugify(name) : existing.slug)
    ).toLowerCase();
    if (!name || !slug) {
      throw new ApplicationError(
        'PRODUCT_INVALID',
        'Product name is invalid',
        'UNPROCESSABLE',
      );
    }
    return {
      name,
      slug,
      description:
        input.description === undefined
          ? existing.description
          : input.description?.trim() || null,
      categoryId:
        input.categoryId === undefined ? existing.categoryId : input.categoryId,
      status: input.status ?? (existing.status as CatalogProductStatus),
    };
  }

  private normaliseOptions(
    options: CatalogOptionInput[],
  ): CatalogOptionInput[] {
    const codes = new Set<string>();
    return options.map((option, position) => {
      const code = option.code.trim().toUpperCase();
      const name = option.name.trim();
      if (!code || !name || codes.has(code)) {
        throw new ApplicationError(
          'PRODUCT_OPTIONS_INVALID',
          'Product options must have unique codes',
          'UNPROCESSABLE',
        );
      }
      codes.add(code);
      const valueCodes = new Set<string>();
      const values = option.values.map((value, valuePosition) => {
        const valueCode = value.code.trim().toUpperCase();
        const label = value.label.trim();
        if (!valueCode || !label || valueCodes.has(valueCode)) {
          throw new ApplicationError(
            'PRODUCT_OPTIONS_INVALID',
            'Option values must have unique codes',
            'UNPROCESSABLE',
          );
        }
        valueCodes.add(valueCode);
        return {
          ...value,
          code: valueCode,
          label,
          position: value.position ?? valuePosition,
        };
      });
      if (values.length === 0) {
        throw new ApplicationError(
          'PRODUCT_OPTIONS_INVALID',
          'Every option needs at least one value',
          'UNPROCESSABLE',
        );
      }
      return {
        ...option,
        code,
        name,
        position: option.position ?? position,
        values,
      };
    });
  }

  private normaliseMedia(
    media: NonNullable<CreateCatalogProductInput['media']>,
  ) {
    const primary = media.filter((item) => item.isPrimary).length;
    if (primary > 1) {
      throw new ApplicationError(
        'PRODUCT_MEDIA_INVALID',
        'A product can have one primary media item',
        'UNPROCESSABLE',
      );
    }
    return media.map((item, index) => ({
      ...item,
      url: item.url.trim(),
      publicId: item.publicId.trim(),
      isPrimary: item.isPrimary ?? index === 0,
      sortOrder: item.sortOrder ?? index,
    }));
  }

  private normaliseVariant(variant: CatalogVariantInput) {
    const sku = variant.sku.trim().toUpperCase();
    const price = variant.price;
    const comparePrice = variant.comparePrice ?? null;
    if (
      !sku ||
      !Number.isInteger(price) ||
      price < 0 ||
      !Number.isInteger(variant.initialStock ?? 0) ||
      (variant.initialStock ?? 0) < 0 ||
      (comparePrice !== null &&
        (!Number.isInteger(comparePrice) || comparePrice < price))
    ) {
      throw new ApplicationError(
        'VARIANT_INVALID',
        'Variant price, compare price, SKU, or inventory is invalid',
        'UNPROCESSABLE',
      );
    }
    return {
      ...variant,
      sku,
      price,
      comparePrice,
      status: variant.status ?? 'ACTIVE',
      initialStock: variant.initialStock ?? 0,
      optionValueIds: variant.optionValueIds?.map((item) => item.trim()),
      optionValueRefs: variant.optionValueRefs?.map((item) => ({
        optionCode: item.optionCode.trim().toUpperCase(),
        valueCode: item.valueCode.trim().toUpperCase(),
      })),
    };
  }

  private async createMedia(
    tx: Prisma.TransactionClient,
    productId: string,
    media: ReturnType<PrismaCatalogV2Repository['normaliseMedia']>,
  ): Promise<Set<string>> {
    const ids = new Set<string>();
    for (const item of media) {
      const id = item.id ?? generateUuidV7();
      ids.add(id);
      await tx.productMedia.create({
        data: { ...item, id, productId },
      });
    }
    return ids;
  }

  private assertRequestedMedia(
    mediaIds: string[],
    knownMedia: Set<string>,
  ): void {
    if (
      new Set(mediaIds).size !== mediaIds.length ||
      mediaIds.some((id) => !knownMedia.has(id))
    ) {
      throw new ApplicationError(
        'VARIANT_MEDIA_INVALID',
        'Variant media must belong to its product',
        'UNPROCESSABLE',
      );
    }
  }

  private async defaultWarehouse(tx: DbClient) {
    const warehouse = await tx.warehouse.findUnique({
      where: { code: DEFAULT_WAREHOUSE_CODE },
    });
    if (!warehouse) throw new Error('Catalog V2 default warehouse is missing');
    return warehouse;
  }

  private async assertCategory(tx: DbClient, categoryId: string | null) {
    if (!categoryId) return;
    const category = await tx.category.findFirst({
      where: { id: categoryId, deletedAt: null },
      select: { id: true },
    });
    if (!category) {
      throw new ApplicationError(
        'CATEGORY_NOT_FOUND',
        'Category not found',
        'NOT_FOUND',
      );
    }
  }

  private async assertAvailableSlug(
    tx: DbClient,
    slug: string,
    exceptId?: string,
  ) {
    const existing = await tx.product.findFirst({
      where: {
        slug: { equals: slug, mode: 'insensitive' },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ApplicationError(
        'PRODUCT_SLUG_CONFLICT',
        'Product slug already exists',
        'CONFLICT',
      );
    }
  }

  private async assertAvailableSkus(tx: DbClient, skus: string[]) {
    if (new Set(skus.map((sku) => sku.toLowerCase())).size !== skus.length) {
      throw new ApplicationError(
        'VARIANT_SKU_CONFLICT',
        'Variant SKUs must be unique',
        'CONFLICT',
      );
    }
    const existing = await tx.productVariant.findFirst({
      where: {
        OR: skus.map((sku) => ({ sku: { equals: sku, mode: 'insensitive' } })),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ApplicationError(
        'VARIANT_SKU_CONFLICT',
        'Variant SKU cannot be reused',
        'CONFLICT',
      );
    }
  }

  private async refreshProjectionInTransaction(
    tx: Prisma.TransactionClient,
    productId: string,
  ): Promise<void> {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: {
        media: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
          take: 1,
        },
        variants: {
          where: { deletedAt: null, status: 'ACTIVE' },
          include: {
            inventoryBalances: {
              where: { warehouse: { code: DEFAULT_WAREHOUSE_CODE } },
              select: { onHand: true, reserved: true },
            },
          },
        },
      },
    });
    if (!product) return;
    const prices = product.variants.map((item) => item.price);
    const availableQuantity = product.variants.reduce(
      (sum, variant) =>
        sum +
        variant.inventoryBalances.reduce(
          (balanceSum, balance) =>
            balanceSum + Math.max(0, balance.onHand - balance.reserved),
          0,
        ),
      0,
    );
    await tx.productCatalogProjection.upsert({
      where: { productId },
      create: {
        productId,
        categoryId: product.categoryId,
        status: product.status,
        publishedAt: product.publishedAt ?? product.createdAt,
        priceMin:
          prices.length > 0
            ? prices.reduce((min, value) => (value.lessThan(min) ? value : min))
            : 0,
        priceMax:
          prices.length > 0
            ? prices.reduce((max, value) =>
                value.greaterThan(max) ? value : max,
              )
            : 0,
        availableQuantity,
        sellableVariantCount: product.variants.length,
        primaryMediaUrl: product.media[0]?.url ?? null,
        searchText: `${product.name} ${product.slug}`.toLowerCase(),
      },
      update: {
        categoryId: product.categoryId,
        status: product.status,
        publishedAt: product.publishedAt ?? product.createdAt,
        priceMin:
          prices.length > 0
            ? prices.reduce((min, value) => (value.lessThan(min) ? value : min))
            : 0,
        priceMax:
          prices.length > 0
            ? prices.reduce((max, value) =>
                value.greaterThan(max) ? value : max,
              )
            : 0,
        availableQuantity,
        sellableVariantCount: product.variants.length,
        primaryMediaUrl: product.media[0]?.url ?? null,
        searchText: `${product.name} ${product.slug}`.toLowerCase(),
        version: { increment: 1 },
      },
    });
  }

  private async getById(
    tx: Prisma.TransactionClient,
    id: string,
    publicOnly: boolean,
  ): Promise<CatalogV2Product> {
    const product = await tx.product.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(publicOnly ? { status: 'ACTIVE' } : {}),
      },
      include: PRODUCT_V2_INCLUDE,
    });
    if (!product) this.productNotFound();
    return this.toProduct(product);
  }

  private async balanceView(
    tx: Prisma.TransactionClient,
    warehouseCode: string,
    variantId: string,
  ): Promise<InventoryBalanceView> {
    const row = await tx.inventoryBalance.findFirstOrThrow({
      where: { variantId, warehouse: { code: warehouseCode } },
      include: { warehouse: { select: { code: true } } },
    });
    return {
      warehouseCode: row.warehouse.code,
      variantId: row.variantId,
      onHand: row.onHand,
      reserved: row.reserved,
      availableQuantity: row.onHand - row.reserved,
    };
  }

  private toProduct(product: ProductWithV2Relations): CatalogV2Product {
    const media = product.media.map((item) => this.toMedia(item));
    const variants: CatalogV2Variant[] = product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      price: variant.price.toNumber(),
      comparePrice: variant.comparePrice?.toNumber() ?? null,
      currency: 'VND',
      status: variant.status as CatalogV2Variant['status'],
      optionValueIds: variant.optionValues.map((item) => item.valueId),
      availableQuantity: variant.inventoryBalances.reduce(
        (sum, balance) => sum + Math.max(0, balance.onHand - balance.reserved),
        0,
      ),
      media: variant.media.map((item) => this.toMedia(item.media)),
    }));
    const projection = product.catalogProjection;
    const priceMin =
      projection?.priceMin.toNumber() ??
      Math.min(...variants.map((item) => item.price), 0);
    const priceMax =
      projection?.priceMax.toNumber() ??
      Math.max(...variants.map((item) => item.price), 0);
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      categoryId: product.categoryId,
      status: product.status as CatalogProductStatus,
      publishedAt: product.publishedAt,
      media,
      options: product.options.map((option) => ({
        id: option.id,
        code: option.code,
        name: option.name,
        position: option.position,
        values: option.values.map((value) => ({
          id: value.id,
          code: value.code,
          label: value.label,
          position: value.position,
        })),
      })),
      variants,
      summary: {
        priceMin,
        priceMax,
        availableQuantity:
          projection?.availableQuantity ??
          variants.reduce((sum, variant) => sum + variant.availableQuantity, 0),
        sellableVariantCount:
          projection?.sellableVariantCount ??
          variants.filter((item) => item.status === 'ACTIVE').length,
        primaryMediaUrl: projection?.primaryMediaUrl ?? media[0]?.url ?? null,
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private toMedia(media: {
    id: string;
    url: string;
    publicId: string;
    isPrimary: boolean;
    sortOrder: number;
  }): CatalogV2Media {
    return {
      id: media.id,
      url: media.url,
      publicId: media.publicId,
      isPrimary: media.isPrimary,
      sortOrder: media.sortOrder,
    };
  }

  private encodeCursor(input: {
    productId: string;
    publishedAt: Date;
  }): string {
    return Buffer.from(
      JSON.stringify({
        id: input.productId,
        at: input.publishedAt.toISOString(),
      }),
    ).toString('base64url');
  }

  private decodeCursor(
    cursor: string | null,
  ): { productId: string; publishedAt: Date } | null {
    if (!cursor) return null;
    try {
      const parsed = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as { id?: string; at?: string };
      const publishedAt = parsed.at ? new Date(parsed.at) : null;
      if (!parsed.id || !publishedAt || Number.isNaN(publishedAt.getTime()))
        throw new Error('Invalid cursor');
      return { productId: parsed.id, publishedAt };
    } catch {
      throw new ApplicationError(
        'CATALOG_CURSOR_INVALID',
        'Catalog cursor is invalid',
        'BAD_REQUEST',
      );
    }
  }

  private productNotFound(): never {
    throw new ApplicationError(
      'PRODUCT_NOT_FOUND',
      'Product not found',
      'NOT_FOUND',
    );
  }

  private throwCatalogPersistenceError(error: unknown): never {
    if (error instanceof ApplicationError) throw error;
    const details = this.persistenceErrorText(error).toLowerCase();
    if (details.includes('23505') || details.includes('unique constraint')) {
      if (details.includes('sku')) {
        throw new ApplicationError(
          'VARIANT_SKU_CONFLICT',
          'Variant SKU cannot be reused',
          'CONFLICT',
        );
      }
      if (details.includes('slug')) {
        throw new ApplicationError(
          'PRODUCT_SLUG_CONFLICT',
          'Product slug already exists',
          'CONFLICT',
        );
      }
      if (details.includes('combination')) {
        throw new ApplicationError(
          'VARIANT_OPTION_COMBINATION_CONFLICT',
          'A variant with this option combination already exists',
          'CONFLICT',
        );
      }
      throw new ApplicationError(
        'CATALOG_CONFLICT',
        'Catalog data conflicts with an existing record',
        'CONFLICT',
      );
    }
    if (details.includes('sku is immutable')) {
      throw new ApplicationError(
        'SKU_IMMUTABLE',
        'Variant SKU is immutable after creation',
        'UNPROCESSABLE',
      );
    }
    if (details.includes('23503') || details.includes('foreign key')) {
      throw new ApplicationError(
        'CATALOG_OWNERSHIP_VIOLATION',
        'Variant options and media must belong to the same product',
        'UNPROCESSABLE',
      );
    }
    if (
      details.includes('23514') ||
      details.includes('must select exactly one value') ||
      details.includes('must have an active variant')
    ) {
      throw new ApplicationError(
        'CATALOG_CONSTRAINT_VIOLATION',
        'Catalog lifecycle or option combination is invalid',
        'UNPROCESSABLE',
      );
    }
    throw error;
  }

  private persistenceErrorText(error: unknown): string {
    const parts: string[] = [];
    let current: unknown = error;
    for (let depth = 0; depth < 4 && current; depth += 1) {
      if (typeof current === 'string') {
        parts.push(current);
        break;
      }
      if (typeof current !== 'object') break;
      const record = current as Record<string, unknown>;
      for (const key of ['code', 'message', 'meta']) {
        const value = record[key];
        if (value !== undefined) parts.push(String(value));
      }
      current = record.cause;
    }
    return parts.join(' ');
  }
}
