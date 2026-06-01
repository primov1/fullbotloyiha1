import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { User } from '../common/entities/user.entity';

@Injectable()
export class BonusResetService {
    private readonly logger = new Logger(BonusResetService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) {}

    @Cron('0 0 1 * *', { name: 'monthly-bonus-reset' })
    async resetMonthlyBonus() {
        const result = await this.userRepo.update(
            { bonus: Not(0) },
            { bonus: 0 },
        );
        this.logger.log(
            `Oylik bonus reset: ${result.affected} foydalanuvchining bonusi 0 ga tushirildi.`,
        );
    }
}
