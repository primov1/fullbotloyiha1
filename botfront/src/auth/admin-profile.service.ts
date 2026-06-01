import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

export interface AdminProfile {
    login: string;
    avatar: string | null;
    name: string;
}

const BCRYPT_ROUNDS = 10;
const BCRYPT_PREFIX = '$2';

@Injectable()
export class AdminProfileService {
    private readonly logger = new Logger(AdminProfileService.name);
    private currentLogin: string;
    private currentPasswordHash: string;
    private currentName: string;
    private currentAvatar: string | null = null;

    constructor(private readonly config: ConfigService) {
        this.currentLogin = this.config.get<string>('ADMIN_LOGIN', 'admin');
        this.currentName = this.config.get<string>('ADMIN_NAME', 'Administrator');

        const storedPassword = this.config.get<string>('ADMIN_PASSWORD', '12345678');
        // Eski plain-text parolni avtomatik hash qilamiz
        if (storedPassword.startsWith(BCRYPT_PREFIX)) {
            this.currentPasswordHash = storedPassword;
        } else {
            this.currentPasswordHash = bcrypt.hashSync(storedPassword, BCRYPT_ROUNDS);
            this.saveEnv();
        }

        const avatarUrl = this.config.get<string>('ADMIN_AVATAR', '');
        if (avatarUrl) {
            this.currentAvatar = avatarUrl;
            return;
        }

        const avatarFile = path.join(process.cwd(), 'public', 'avatars', 'admin_avatar');
        for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
            if (fs.existsSync(avatarFile + ext)) {
                this.currentAvatar = `/avatars/admin_avatar${ext}`;
                break;
            }
        }
    }

    getLogin(): string { return this.currentLogin; }

    getProfile(): AdminProfile {
        return { login: this.currentLogin, avatar: this.currentAvatar, name: this.currentName };
    }

    validatePassword(password: string): boolean {
        return bcrypt.compareSync(password, this.currentPasswordHash);
    }

    updateLogin(newLogin: string): void { this.currentLogin = newLogin.trim(); this.saveEnv(); }

    updatePassword(newPassword: string): void {
        this.currentPasswordHash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);
        this.saveEnv();
    }

    updateName(newName: string): void { this.currentName = newName.trim(); this.saveEnv(); }

    saveAvatar(url: string): void { this.currentAvatar = url; }

    removeAvatar(): void { this.currentAvatar = null; }

    private saveEnv(): void {
        try {
            const envPath = path.join(process.cwd(), '.env');
            if (!fs.existsSync(envPath)) return;
            let content = fs.readFileSync(envPath, 'utf-8');
            content = this.setEnvVar(content, 'ADMIN_LOGIN', this.currentLogin);
            content = this.setEnvVar(content, 'ADMIN_PASSWORD', this.currentPasswordHash);
            content = this.setEnvVar(content, 'ADMIN_NAME', this.currentName);
            fs.writeFileSync(envPath, content, 'utf-8');
        } catch (err) {
            this.logger.warn(`.env yangilanmadi: ${(err as Error).message}`);
        }
    }

    private setEnvVar(content: string, key: string, value: string): string {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        return regex.test(content) ? content.replace(regex, `${key}=${value}`) : content + `\n${key}=${value}`;
    }
}
