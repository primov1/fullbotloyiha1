import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Gift } from '../common/entities/gift.entity';

export interface GiftDto {
    title?: string;
    image?: string;
    price?: number | string;
}

@Injectable()
export class GiftsService {
    constructor(
        @InjectRepository(Gift)
        private readonly giftRepo: Repository<Gift>,
    ) {}

    async list(q?: string, page = 1, limit = 20) {
        page = Math.max(1, Number(page) || 1);
        limit = Math.min(100, Math.max(5, Number(limit) || 20));
        const skip = (page - 1) * limit;

        const where = q?.trim() ? { title: ILike(`%${q.trim()}%`) } : {};

        const [items, total] = await this.giftRepo.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        });

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
            q: q?.trim() ?? '',
        };
    }

    async findById(id: number) {
        const item = await this.giftRepo.findOne({ where: { id } });
        if (!item) throw new NotFoundException('Gift topilmadi');
        return item;
    }

    private normalize(dto: GiftDto, requireAll: boolean) {
        const payload: Partial<Gift> = {};
        if (dto.title !== undefined) payload.title = String(dto.title).trim();
        if (dto.image !== undefined) payload.image = String(dto.image).trim();
        if (dto.price !== undefined) {
            const num = Number(dto.price);
            if (Number.isNaN(num) || num < 0) {
                throw new BadRequestException("price musbat son bo'lishi kerak");
            }
            payload.price = num;
        }

        if (requireAll) {
            if (!payload.title) throw new BadRequestException('title majburiy');
            if (!payload.image) throw new BadRequestException('image majburiy');
            if (payload.price === undefined) throw new BadRequestException('price majburiy');
        } else {
            if ('title' in payload && !payload.title)
                throw new BadRequestException("title bo'sh bo'lmasligi kerak");
            if ('image' in payload && !payload.image)
                throw new BadRequestException("image bo'sh bo'lmasligi kerak");
        }
        return payload;
    }

    async create(dto: GiftDto) {
        const payload = this.normalize(dto, true);
        const gift = this.giftRepo.create(payload);
        return this.giftRepo.save(gift);
    }

    async update(id: number, dto: GiftDto) {
        const existing = await this.giftRepo.findOne({ where: { id } });
        if (!existing) throw new NotFoundException('Gift topilmadi');
        const payload = this.normalize(dto, false);
        Object.assign(existing, payload);
        return this.giftRepo.save(existing);
    }

    async remove(id: number) {
        const item = await this.giftRepo.findOne({ where: { id } });
        if (!item) throw new NotFoundException('Gift topilmadi');
        await this.giftRepo.remove(item);
        return item;
    }

    async count() {
        return this.giftRepo.count();
    }
}
