import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfirmationsController } from './confirmations.controller';
import { ConfirmationsService } from './confirmations.service';
import { PendingCountInterceptor } from './pending-count.interceptor';
import { Purchase } from '../common/entities/purchase.entity';
import { User } from '../common/entities/user.entity';
import { Product } from '../common/entities/product.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Purchase, User, Product])],
    controllers: [ConfirmationsController],
    providers: [
        ConfirmationsService,
        { provide: APP_INTERCEPTOR, useClass: PendingCountInterceptor },
    ],
    exports: [ConfirmationsService],
})
export class ConfirmationsModule {}
