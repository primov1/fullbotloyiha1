import { Body, Controller, Get, Param, ParseIntPipe, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { BroadcastService } from './broadcast.service';
import { AdminAuthGuard } from '../common/auth.guard';
import { UsersService } from '../users/users.service';

@Controller('broadcast')
@UseGuards(AdminAuthGuard)
export class BroadcastController {
    constructor(
        private readonly broadcastService: BroadcastService,
        private readonly usersService: UsersService,
    ) {}

    @Get()
    showForm(@Res() res: Response) {
        return res.render('broadcast', {
            title: 'Xabar yuborish', active: 'broadcast',
        });
    }

    @Post('all')
    async sendToAll(@Body('message') message: string, @Res() res: Response) {
        const trimmed = (message ?? '').trim();
        if (!trimmed) {
            return res.render('broadcast', {
                title: 'Xabar yuborish', active: 'broadcast',
                error: "Xabar bo'sh bo'lishi mumkin emas.",
            });
        }
        const result = await this.broadcastService.sendToAll(trimmed);
        return res.render('broadcast', {
            title: 'Xabar yuborish', active: 'broadcast', result,
        });
    }

    @Post('user/:id')
    async sendToOne(
        @Param('id', ParseIntPipe) id: number,
        @Body('message') message: string,
        @Res() res: Response,
    ) {
        const trimmed = (message ?? '').trim();
        if (!trimmed) return res.redirect(`/users/${id}?msg_error=1`);
        const user = await this.usersService.findById(id);
        const ok = await this.broadcastService.sendToOne(user.telegramId, trimmed);
        return res.redirect(`/users/${id}?msg_sent=${ok ? '1' : '0'}`);
    }
}
