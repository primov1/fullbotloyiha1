import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { DataSource, Repository } from 'typeorm';
import {
    Purchase,
    PurchaseStatus,
    PURCHASE_STATUSES,
} from '../common/entities/purchase.entity';
import { User } from '../common/entities/user.entity';

export type StatusFilter = PurchaseStatus | 'all';

@Injectable()
export class ConfirmationsService {
    private readonly logger = new Logger(ConfirmationsService.name);

    constructor(
        @InjectRepository(Purchase)
        private readonly purchaseRepo: Repository<Purchase>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectBot() private readonly bot: Telegraf,
        private readonly dataSource: DataSource,
    ) {}

    async counts() {
        const [pending, approved, rejected] = await Promise.all([
            this.purchaseRepo.count({ where: { status: 'pending' } }),
            this.purchaseRepo.count({ where: { status: 'approved' } }),
            this.purchaseRepo.count({ where: { status: 'rejected' } }),
        ]);
        return { pending, approved, rejected, total: pending + approved + rejected };
    }

    async pendingCount() {
        return this.purchaseRepo.count({ where: { status: 'pending' } });
    }

    async list(status: string | undefined, page = 1, limit = 20) {
        const st: StatusFilter =
            status === 'all' ||
            (PURCHASE_STATUSES as readonly string[]).includes(status ?? '')
                ? (status as StatusFilter)
                : 'pending';

        page = Math.max(1, Number(page) || 1);
        limit = Math.min(100, Math.max(5, Number(limit) || 20));
        const skip = (page - 1) * limit;

        const where = st === 'all' ? {} : { status: st as PurchaseStatus };

        const [rows, total, counts] = await Promise.all([
            this.purchaseRepo.find({
                where,
                order: { createdAt: 'DESC' },
                skip,
                take: limit,
                relations: ['user', 'product'],
            }),
            this.purchaseRepo.count({ where }),
            this.counts(),
        ]);

        const items = rows.map((r) => ({
            id: r.id,
            bonus: r.bonus ?? 0,
            status: r.status ?? 'pending',
            reviewSubmitted: !!r.reviewSubmitted,
            proofImage: r.proofImage ?? '',
            reviewComment: r.reviewComment ?? '',
            reviewNote: r.reviewNote ?? '',
            reviewedAt: r.reviewedAt ?? null,
            createdAt: r.createdAt,
            user: r.user
                ? {
                      id: r.user.id,
                      firstName: r.user.firstName ?? '',
                      lastName: r.user.lastName ?? '',
                      phone: r.user.phone ?? '',
                      username: r.user.username ?? '',
                  }
                : null,
            product: r.product
                ? {
                      id: r.product.id,
                      title: r.product.title ?? '',
                      uzum_url: r.product.uzum_url ?? '',
                  }
                : null,
        }));

        const totalPages = Math.max(1, Math.ceil(total / limit));
        return {
            items,
            total,
            page,
            limit,
            totalPages,
            hasPrev: page > 1,
            hasNext: page < totalPages,
            prevPage: Math.max(1, page - 1),
            nextPage: Math.min(totalPages, page + 1),
            status: st,
            counts,
        };
    }

    private async setStatus(id: number, status: PurchaseStatus, reviewNote = '') {
        const purchase = await this.purchaseRepo.findOne({ where: { id } });
        if (!purchase) throw new NotFoundException('Yozuv topilmadi');
        purchase.status = status;
        purchase.reviewedAt = new Date();
        purchase.reviewNote = reviewNote;
        return this.purchaseRepo.save(purchase);
    }

    private async notifyUser(telegramId: number | undefined, text: string) {
        if (!telegramId) return;
        try {
            await this.bot.telegram.sendMessage(telegramId, text);
        } catch (err) {
            this.logger.warn(
                `Telegram xabar yuborilmadi (${telegramId}): ${(err as Error).message}`,
            );
        }
    }

    async approve(id: number) {
        let notifyTelegramId: number | undefined;
        let notifyText = '';

        const updated = await this.dataSource.transaction(async (em) => {
            const purchase = await em.findOne(Purchase, {
                where: { id },
                relations: ['product', 'user'],
                lock: { mode: 'pessimistic_write' },
            });
            if (!purchase) throw new NotFoundException('Yozuv topilmadi');

            const alreadyApproved = purchase.status === 'approved';

            let updatedBonus = purchase.user?.bonus ?? 0;
            if (!alreadyApproved && purchase.bonus > 0) {
                await em.increment(User, { id: purchase.userId }, 'bonus', purchase.bonus);
                updatedBonus = (purchase.user?.bonus ?? 0) + purchase.bonus;
            }

            purchase.status = 'approved';
            purchase.reviewedAt = new Date();
            const saved = await em.save(purchase);

            if (!alreadyApproved) {
                notifyTelegramId = purchase.user?.telegramId;
                notifyText =
                    `✅ Tabriklaymiz! "${purchase.product?.title ?? 'mahsulot'}" uchun xaridingiz tasdiqlandi.\n` +
                    `🎉 +${purchase.bonus} bonus hisobingizga qo'shildi.\n` +
                    `💰 Joriy bonusingiz: ${updatedBonus}`;
            }
            return saved;
        });

        await this.notifyUser(notifyTelegramId, notifyText);
        return updated;
    }

    async reject(id: number, note = '') {
        const purchase = await this.purchaseRepo.findOne({
            where: { id },
            relations: ['product', 'user'],
        });
        if (!purchase) throw new NotFoundException('Yozuv topilmadi');

        const wasApproved = purchase.status === 'approved';
        const alreadyRejected = purchase.status === 'rejected';

        let user = purchase.user;
        if (wasApproved && purchase.bonus > 0) {
            await this.userRepo.decrement({ id: purchase.userId }, 'bonus', purchase.bonus);
            user = await this.userRepo.findOne({ where: { id: purchase.userId } }) ?? user;
        }

        const updated = await this.setStatus(id, 'rejected', note);

        if (!alreadyRejected) {
            const productTitle = purchase.product?.title ?? 'mahsulot';
            let text =
                `❌ "${productTitle}" uchun xaridingiz rad etildi.\n` +
                `Bonus hisobingizga qo'shilmadi.`;
            if (note) text += `\n📝 Sabab: ${note}`;
            await this.notifyUser(user?.telegramId, text);
        }
        return updated;
    }
}
