import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { UsersModule } from '../users/users.module';
import { ProductsModule } from '../products/products.module';
import { GiftsModule } from '../gifts/gifts.module';
import { ConfirmationsModule } from '../confirmations/confirmations.module';

@Module({
    imports: [UsersModule, ProductsModule, GiftsModule, ConfirmationsModule],
    controllers: [DashboardController],
})
export class DashboardModule {}
