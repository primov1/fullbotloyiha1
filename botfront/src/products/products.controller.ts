import {
    Body, Controller, Get, Param, ParseIntPipe,
    Post, Query, Res, UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ProductsService } from './products.service';
import { AdminAuthGuard } from '../common/auth.guard';

@Controller('products')
@UseGuards(AdminAuthGuard)
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

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
        const data = await this.productsService.list(q, Number(page) || 1, Number(limit) || 20);
        return res.render('products', {
            title: 'Mahsulotlar', active: 'products', data,
            created: created === '1', updated: updated === '1', deleted: deleted === '1',
        });
    }

    @Get('new')
    newForm(@Res() res: Response) {
        return res.render('product-edit', {
            title: "Mahsulot qo'shish", active: 'products', mode: 'create',
            product: { title: '', image: '', uzum_url: '', bonus: '', telegramChannel: '', instagram: '', requireChannel: false },
        });
    }

    @Post('new')
    async create(
        @Body('title') title: string,
        @Body('image') image: string,
        @Body('uzum_url') uzum_url: string,
        @Body('bonus') bonus: string,
        @Body('telegramChannel') telegramChannel: string,
        @Body('instagram') instagram: string,
        @Body('requireChannel') requireChannel: string,
        @Res() res: Response,
    ) {
        try {
            await this.productsService.create({ title, image, uzum_url, bonus, telegramChannel, instagram, requireChannel });
            return res.redirect('/products?created=1');
        } catch (err: any) {
            return res.render('product-edit', {
                title: "Mahsulot qo'shish", active: 'products', mode: 'create',
                product: { title, image, uzum_url, bonus, telegramChannel, instagram, requireChannel },
                error: err?.message || 'Saqlashda xatolik',
            });
        }
    }

    @Get(':id/edit')
    async edit(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
        const product = await this.productsService.findById(id);
        return res.render('product-edit', {
            title: 'Mahsulotni tahrirlash', active: 'products', mode: 'edit', product,
        });
    }

    @Post(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body('title') title: string,
        @Body('image') image: string,
        @Body('uzum_url') uzum_url: string,
        @Body('bonus') bonus: string,
        @Body('telegramChannel') telegramChannel: string,
        @Body('instagram') instagram: string,
        @Body('requireChannel') requireChannel: string,
        @Res() res: Response,
    ) {
        try {
            await this.productsService.update(id, { title, image, uzum_url, bonus, telegramChannel, instagram, requireChannel });
            return res.redirect('/products?updated=1');
        } catch (err: any) {
            const product = await this.productsService.findById(id);
            return res.render('product-edit', {
                title: 'Mahsulotni tahrirlash', active: 'products', mode: 'edit',
                product: { ...product, title, image, uzum_url, bonus, telegramChannel, instagram, requireChannel },
                error: err?.message || 'Yangilashda xatolik',
            });
        }
    }

    @Post(':id/delete')
    async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
        await this.productsService.remove(id);
        return res.redirect('/products?deleted=1');
    }
}
