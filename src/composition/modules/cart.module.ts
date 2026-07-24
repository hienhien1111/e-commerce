import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DiscountModule } from '@/composition/modules/discount.module';
import { CART_PRODUCT_LOOKUP_PORT } from '@/application/cart/ports/cart-product-lookup.port.token';
import { CART_REPOSITORY_PORT } from '@/application/cart/ports/cart.repository.port.token';
import { CartProductService } from '@/application/cart/services/cart-product.service';
import { CartViewService } from '@/application/cart/services/cart-view.service';
import { AddToCartHandler } from '@/application/cart/commands/add-to-cart';
import { UpdateCartItemHandler } from '@/application/cart/commands/update-cart-item';
import { RemoveFromCartHandler } from '@/application/cart/commands/remove-from-cart';
import { ClearCartHandler } from '@/application/cart/commands/clear-cart';
import { ApplyCartCouponHandler } from '@/application/cart/commands/apply-cart-coupon';
import { RemoveCartCouponHandler } from '@/application/cart/commands/remove-cart-coupon';
import { GetCartHandler } from '@/application/cart/queries/get-cart';
import { PrismaModule } from '@/infrastructure/persistence/prisma/prisma.module';
import { PrismaCartRepository } from '@/infrastructure/persistence/repositories/prisma-cart.repository';
import { CartController } from '@/presentation/http/controllers/cart.controller';

@Module({
  imports: [CqrsModule, PrismaModule, DiscountModule],
  controllers: [CartController],
  providers: [
    PrismaCartRepository,
    CartProductService,
    CartViewService,
    AddToCartHandler,
    UpdateCartItemHandler,
    RemoveFromCartHandler,
    ClearCartHandler,
    ApplyCartCouponHandler,
    RemoveCartCouponHandler,
    GetCartHandler,
    { provide: CART_REPOSITORY_PORT, useExisting: PrismaCartRepository },
    { provide: CART_PRODUCT_LOOKUP_PORT, useExisting: PrismaCartRepository },
  ],
})
export class CartModule {}
