import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminAuthGuard } from '../common/auth.guard';
import sharp from 'sharp';

@Controller('api')
@UseGuards(AdminAuthGuard)
export class UploadController {
    @Post('upload-image')
    @UseInterceptors(FileInterceptor('image', {
        storage: memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
        },
    }))
    async uploadImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) return { success: false, error: 'Fayl yuklanmadi' };
        try {
            const optimized = await sharp(file.buffer)
                .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 85 })
                .toBuffer();

            const body = new URLSearchParams();
            body.append('key', process.env.IMGBB_API_KEY ?? '');
            body.append('image', optimized.toString('base64'));

            const response = await fetch('https://api.imgbb.com/1/upload', {
                method: 'POST',
                body,
            });
            const json = await response.json() as any;
            if (!json?.success) throw new Error('ImgBB xatosi');

            return { success: true, url: json.data.display_url as string };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    }
}
