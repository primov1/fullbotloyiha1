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
import { ConfirmationsService } from './confirmations.service';
import { AdminAuthGuard } from '../common/auth.guard';

@Controller('confirmations')
@UseGuards(AdminAuthGuard)
export class ConfirmationsController {
    constructor(private readonly confirmationsService: ConfirmationsService) {}

    @Get()
    async list(
        @Query('status') status: string,
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('approved') approved: string,
        @Query('rejected') rejected: string,
        @Res() res: Response,
    ) {
        const data = await this.confirmationsService.list(
            status,
            Number(page) || 1,
            Number(limit) || 20,
        );
        return res.render('confirmations', {
            title: 'Bonus tasdiqlash',
            active: 'confirmations',
            data,
            approved: approved === '1',
            rejected: rejected === '1',
        });
    }

    @Post(':id/approve')
    async approve(
        @Param('id', ParseIntPipe) id: number,
        @Query('status') status: string,
        @Res() res: Response,
    ) {
        await this.confirmationsService.approve(id);
        return res.redirect(this.backUrl(status, 'approved'));
    }

    @Post(':id/reject')
    async reject(
        @Param('id', ParseIntPipe) id: number,
        @Body('note') note: string,
        @Query('status') status: string,
        @Res() res: Response,
    ) {
        await this.confirmationsService.reject(id, (note ?? '').trim());
        return res.redirect(this.backUrl(status, 'rejected'));
    }

    private backUrl(status: string, flag: 'approved' | 'rejected') {
        const valid = ['pending', 'approved', 'rejected', 'all'];
        const st = valid.includes(status) ? status : 'pending';
        return `/confirmations?status=${st}&${flag}=1`;
    }
}
