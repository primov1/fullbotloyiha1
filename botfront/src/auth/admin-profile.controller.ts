import {
    Body, Controller, Get, Post, Query, Res, UseGuards,
    UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { AdminAuthGuard } from '../common/auth.guard';
import { AdminProfileService } from './admin-profile.service';
import { AuthService } from './auth.service';
import { AUTH_COOKIE } from '../common/auth.guard';
import sharp from 'sharp';

@Controller('admin/profile')
@UseGuards(AdminAuthGuard)
export class AdminProfileController {
    constructor(
        private readonly profileService: AdminProfileService,
        private readonly authService: AuthService,
    ) {}

    @Get()
    show(@Query() query: Record<string, string>, @Res() res: Response) {
        return res.render('admin-profile', {
            title: 'Admin profil', active: 'admin-profile',
            profile: this.profileService.getProfile(), query,
        });
    }

    @Post('name')
    updateName(@Body('name') name: string, @Res() res: Response) {
        const t = (name ?? '').trim();
        if (!t) return res.redirect('/admin/profile?name_error=1');
        this.profileService.updateName(t);
        return res.redirect('/admin/profile?name_ok=1');
    }

    @Post('credentials')
    updateCredentials(
        @Body('currentPassword') currentPassword: string,
        @Body('newLogin') newLogin: string,
        @Body('newPassword') newPassword: string,
        @Body('confirmPassword') confirmPassword: string,
        @Res() res: Response,
    ) {
        if (!this.profileService.validatePassword(currentPassword ?? ''))
            return res.redirect('/admin/profile?cred_error=wrong_current');

        const loginVal = (newLogin ?? '').trim();
        const passVal  = (newPassword ?? '').trim();

        if (!loginVal || loginVal.length < 3)
            return res.redirect('/admin/profile?cred_error=login_short');

        if (passVal) {
            if (passVal.length < 6)
                return res.redirect('/admin/profile?cred_error=pass_short');
            if (passVal !== (confirmPassword ?? '').trim())
                return res.redirect('/admin/profile?cred_error=pass_mismatch');
        }

        this.profileService.updateLogin(loginVal);
        if (passVal) this.profileService.updatePassword(passVal);

        const { token, ttl } = this.authService.sign({
            sub: this.profileService.getLogin(), role: 'admin',
        });
        res.cookie(AUTH_COOKIE, token, {
            httpOnly: true, sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: ttl * 1000, path: '/',
        });
        return res.redirect('/admin/profile?cred_ok=1');
    }

    @Post('avatar')
    @UseInterceptors(FileInterceptor('avatar', {
        storage: memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
        },
    }))
    async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
        if (!file) return res.redirect('/admin/profile?avatar_error=invalid_file');
        try {
            const resized = await sharp(file.buffer)
                .resize(200, 200, { fit: 'cover' })
                .jpeg({ quality: 85 })
                .toBuffer();

            const apiKey = process.env.IMGBB_API_KEY ?? '';
            const body = new URLSearchParams();
            body.append('key', apiKey);
            body.append('image', resized.toString('base64'));

            const response = await fetch('https://api.imgbb.com/1/upload', {
                method: 'POST',
                body,
            });

            const json = await response.json() as any;
            if (!json?.success) throw new Error('ImgBB upload failed');

            const imageUrl: string = json.data.display_url;
            this.profileService.saveAvatar(imageUrl);
            return res.redirect('/admin/profile?avatar_ok=1');
        } catch {
            return res.redirect('/admin/profile?avatar_error=processing');
        }
    }

    @Post('avatar/remove')
    removeAvatar(@Res() res: Response) {
        this.profileService.removeAvatar();
        return res.redirect('/admin/profile?avatar_removed=1');
    }
}
