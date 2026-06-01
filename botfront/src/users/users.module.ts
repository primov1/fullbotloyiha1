import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { BonusResetService } from './bonus-reset.service';
import { User } from '../common/entities/user.entity';
import { Purchase } from '../common/entities/purchase.entity';
import { GiftPurchase } from '../common/entities/gift-purchase.entity';

@Module({
    imports: [TypeOrmModule.forFeature([User, Purchase, GiftPurchase])],
    controllers: [UsersController],
    providers: [UsersService, BonusResetService],
    exports: [UsersService],
})
export class UsersModule {}
