import {
    Body, Controller, Delete, Get, Param, ParseIntPipe,
    Post, Query, Res, UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { UsersService } from './users.service';
import { AdminAuthGuard } from '../common/auth.guard';

@Controller('users')
@UseGuards(AdminAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    async list(
        @Query('q') q: string,
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('updated') updated: string,
        @Res() res: Response,
    ) {
        const data = await this.usersService.list({
            q: q ?? '', page: Number(page) || 1, limit: Number(limit) || 20,
        });
        return res.render('users', {
            title: 'Foydalanuvchilar', active: 'users', data, updated: updated === '1',
        });
    }

    @Get('export')
    async export(@Query('q') q: string, @Res() res: Response) {
        const buffer = await this.usersService.exportExcel(q ?? '');
        const filename = `foydalanuvchilar_${Date.now()}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }

    @Get(':id')
    async show(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
        const profile = await this.usersService.profile(id);
        return res.render('user-profile', {
            title: 'Foydalanuvchi profili', active: 'users', ...profile,
        });
    }

    @Get(':id/edit')
    async edit(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
        const user = await this.usersService.findById(id);
        return res.render('user-edit', {
            title: 'Foydalanuvchini tahrirlash', active: 'users', user,
        });
    }

    @Post(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body('firstName') firstName: string,
        @Body('lastName') lastName: string,
        @Body('phone') phone: string,
        @Res() res: Response,
    ) {
        await this.usersService.update(id, { firstName, lastName, phone });
        return res.redirect('/users?updated=1');
    }

    @Post(':id/delete')
    async delete(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
        await this.usersService.delete(id);
        return res.redirect('/users');
    }
}
