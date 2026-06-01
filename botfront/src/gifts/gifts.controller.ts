import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    Res,
    UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { GiftsService } from './gifts.service';
import { AdminAuthGuard } from '../common/auth.guard';

@Controller('gifts')
@UseGuards(AdminAuthGuard)
export class GiftsController {
    constructor(private readonly giftsService: GiftsService) {}

    @Get()
    async list(
        @Query('q') q: string,
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('created') created: string,
        @Query('updated') updated: string,
        @Query('deleted') deleted: string,
        @Res() res: Response,
    ) {
        const data = await this.giftsService.list(q, Number(page) || 1, Number(limit) || 20);
        return res.render('gifts', {
            title: "Sovg'alar",
            active: 'gifts',
            data,
            created: created === '1',
            updated: updated === '1',
            deleted: deleted === '1',
        });
    }

    @Get('new')
    newForm(@Res() res: Response) {
        return res.render('gift-edit', {
            title: "Sovg'a qo'shish",
            active: 'gifts',
            mode: 'create',
            gift: { title: '', image: '', price: '' },
        });
    }

    @Post('new')
    async create(
        @Body('title') title: string,
        @Body('image') image: string,
        @Body('price') price: string,
        @Res() res: Response,
    ) {
        try {
            await this.giftsService.create({ title, image, price });
            return res.redirect('/gifts?created=1');
        } catch (err: any) {
            return res.render('gift-edit', {
                title: "Sovg'a qo'shish",
                active: 'gifts',
                mode: 'create',
                gift: { title, image, price },
                error: err?.message || 'Saqlashda xatolik',
            });
        }
    }

    @Get(':id/edit')
    async edit(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
        const gift = await this.giftsService.findById(id);
        return res.render('gift-edit', {
            title: "Sovg'ani tahrirlash",
            active: 'gifts',
            mode: 'edit',
            gift,
        });
    }

    @Post(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body('title') title: string,
        @Body('image') image: string,
        @Body('price') price: string,
        @Res() res: Response,
    ) {
        try {
            await this.giftsService.update(id, { title, image, price });
            return res.redirect('/gifts?updated=1');
        } catch (err: any) {
            const gift = await this.giftsService.findById(id);
            return res.render('gift-edit', {
                title: "Sovg'ani tahrirlash",
                active: 'gifts',
                mode: 'edit',
                gift: { ...gift, title, image, price },
                error: err?.message || 'Yangilashda xatolik',
            });
        }
    }

    @Post(':id/delete')
    async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
        await this.giftsService.remove(id);
        return res.redirect('/gifts?deleted=1');
    }
}
