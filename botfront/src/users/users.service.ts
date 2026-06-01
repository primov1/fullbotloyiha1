import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, ILike } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { User } from '../common/entities/user.entity';
import { Purchase } from '../common/entities/purchase.entity';
import { GiftPurchase } from '../common/entities/gift-purchase.entity';

export interface UpdateUserDto {
    firstName?: string;
    lastName?: string;
    phone?: string;
}

export interface UsersQuery {
    q?: string;
    page?: number;
    limit?: number;
}

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(Purchase)
        private readonly purchaseRepo: Repository<Purchase>,
        @InjectRepository(GiftPurchase)
        private readonly giftPurchaseRepo: Repository<GiftPurchase>,
        private readonly dataSource: DataSource,
    ) {}

    async list(query: UsersQuery) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(5, Number(query.limit) || 20));
        const skip = (page - 1) * limit;
        const term = (query.q ?? '').trim();

        const where = term
            ? [
                  { firstName: ILike(`%${term}%`) },
                  { lastName: ILike(`%${term}%`) },
                  { phone: ILike(`%${term}%`) },
              ]
            : {};

        const [items, total] = await this.userRepo.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        });

        const totalPages = Math.max(1, Math.ceil(total / limit));
        return {
            items, total, page, limit, totalPages,
            hasPrev: page > 1,
            hasNext: page < totalPages,
            prevPage: Math.max(1, page - 1),
            nextPage: Math.min(totalPages, page + 1),
            q: term,
        };
    }

    async findById(id: number) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user) throw new NotFoundException('User topilmadi');
        return user;
    }

    async update(id: number, dto: UpdateUserDto) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user) throw new NotFoundException('User topilmadi');
        if (typeof dto.firstName === 'string') user.firstName = dto.firstName.trim();
        if (typeof dto.lastName === 'string') user.lastName = dto.lastName.trim();
        if (typeof dto.phone === 'string') user.phone = dto.phone.trim();
        return this.userRepo.save(user);
    }

    async delete(id: number) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user) throw new NotFoundException('User topilmadi');
        await this.dataSource.transaction(async (em) => {
            await em.delete(Purchase, { userId: id });
            await em.delete(GiftPurchase, { userId: id });
            await em.remove(user);
        });
    }

    async count() {
        return this.userRepo.count();
    }

    async exportExcel(q?: string): Promise<ExcelJS.Buffer> {
        const term = (q ?? '').trim();
        const where = term
            ? [
                  { firstName: ILike(`%${term}%`) },
                  { lastName: ILike(`%${term}%`) },
                  { phone: ILike(`%${term}%`) },
              ]
            : {};

        const users = await this.userRepo.find({ where, order: { createdAt: 'DESC' } });
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Foydalanuvchilar');

        sheet.columns = [
            { header: '#', key: 'num', width: 6 },
            { header: 'Ism', key: 'firstName', width: 20 },
            { header: 'Familiya', key: 'lastName', width: 20 },
            { header: 'Telefon', key: 'phone', width: 18 },
            { header: 'Username', key: 'username', width: 20 },
            { header: 'Bonus', key: 'bonus', width: 10 },
            { header: 'Sana', key: 'createdAt', width: 20 },
        ];
        sheet.getRow(1).font = { bold: true };

        users.forEach((u, i) => {
            sheet.addRow({
                num: i + 1,
                firstName: u.firstName || '',
                lastName: u.lastName || '',
                phone: u.phone || '',
                username: u.username ? `@${u.username}` : '',
                bonus: u.bonus ?? 0,
                createdAt: u.createdAt ? new Date(u.createdAt).toLocaleString('uz-UZ') : '',
            });
        });

        return workbook.xlsx.writeBuffer();
    }

    async profile(id: number) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user) throw new NotFoundException('User topilmadi');

        const [purchases, giftPurchases] = await Promise.all([
            this.purchaseRepo.find({
                where: { userId: id },
                order: { createdAt: 'DESC' },
                relations: ['product'],
            }),
            this.giftPurchaseRepo.find({
                where: { userId: id },
                order: { createdAt: 'DESC' },
                relations: ['gift'],
            }),
        ]);

        const purchaseRows = purchases.map((p) => ({
            id: p.id, bonus: p.bonus ?? 0, status: p.status ?? 'pending',
            reviewSubmitted: !!p.reviewSubmitted, proofImage: p.proofImage ?? '',
            reviewComment: p.reviewComment ?? '', reviewNote: p.reviewNote ?? '',
            reviewedAt: p.reviewedAt ?? null, createdAt: p.createdAt,
            product: p.product ? {
                id: p.product.id, title: p.product.title,
                uzum_url: p.product.uzum_url, bonus: p.product.bonus,
            } : null,
        }));

        const giftRows = giftPurchases.map((g) => ({
            id: g.id, price: g.price ?? 0, createdAt: g.createdAt,
            gift: g.gift ? {
                id: g.gift.id, title: g.gift.title,
                image: g.gift.image, price: g.gift.price,
            } : null,
        }));

        const totalBonusEarned = purchaseRows.filter((r) => r.status === 'approved').reduce((acc, r) => acc + (Number(r.bonus) || 0), 0);
        const totalBonusPending = purchaseRows.filter((r) => r.status === 'pending').reduce((acc, r) => acc + (Number(r.bonus) || 0), 0);
        const totalBonusSpent = giftRows.reduce((acc, r) => acc + (Number(r.price) || 0), 0);
        const pendingCount = purchaseRows.filter((r) => r.status === 'pending').length;
        const approvedCount = purchaseRows.filter((r) => r.status === 'approved').length;
        const rejectedCount = purchaseRows.filter((r) => r.status === 'rejected').length;

        return {
            user, purchases: purchaseRows, giftPurchases: giftRows,
            totals: {
                purchases: purchaseRows.length, giftPurchases: giftRows.length,
                bonusEarned: totalBonusEarned, bonusPending: totalBonusPending,
                bonusSpent: totalBonusSpent, bonusBalance: totalBonusEarned - totalBonusSpent,
                pendingCount, approvedCount, rejectedCount,
            },
        };
    }
}
