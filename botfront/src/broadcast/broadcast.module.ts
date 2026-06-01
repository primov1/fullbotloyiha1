import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BroadcastService } from './broadcast.service';
import { BroadcastController } from './broadcast.controller';
import { User } from '../common/entities/user.entity';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [TypeOrmModule.forFeature([User]), UsersModule],
    providers: [BroadcastService],
    controllers: [BroadcastController],
    exports: [BroadcastService],
})
export class BroadcastModule {}
