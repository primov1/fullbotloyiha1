import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegrafModule } from 'nestjs-telegraf';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { GiftsModule } from './gifts/gifts.module';
import { ConfirmationsModule } from './confirmations/confirmations.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BroadcastModule } from './broadcast/broadcast.module';
import { UploadModule } from './upload/upload.module';
import { User } from './common/entities/user.entity';
import { Product } from './common/entities/product.entity';
import { Gift } from './common/entities/gift.entity';
import { Purchase } from './common/entities/purchase.entity';
import { GiftPurchase } from './common/entities/gift-purchase.entity';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
        ScheduleModule.forRoot(),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: 'postgres',
                host: config.get<string>('DB_HOST', 'localhost'),
                port: config.get<number>('DB_PORT', 5432),
                username: config.get<string>('DB_USERNAME', 'postgres'),
                password: config.get<string>('DB_PASSWORD', ''),
                database: config.get<string>('DB_NAME', 'bot_loyiha'),
                entities: [User, Product, Gift, Purchase, GiftPurchase],
                synchronize: config.get<string>('NODE_ENV') !== 'production',
                logging: config.get<string>('NODE_ENV') === 'development',
                ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
            }),
        }),
        TelegrafModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                token: config.get<string>('BOT_TOKEN') ?? '',
                launchOptions: false,
            }),
        }),
        AuthModule,
        UsersModule,
        ProductsModule,
        GiftsModule,
        ConfirmationsModule,
        DashboardModule,
        BroadcastModule,
        UploadModule,
    ],
})
export class AppModule {}
