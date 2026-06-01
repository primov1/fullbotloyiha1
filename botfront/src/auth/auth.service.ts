import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthPayload } from '../common/auth.guard';
import { AdminProfileService } from './admin-profile.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly config: ConfigService,
        private readonly jwt: JwtService,
        private readonly profileService: AdminProfileService,
    ) {}

    validate(login: string, password: string): AuthPayload {
        const isValid = login === this.profileService.getLogin()
            && this.profileService.validatePassword(password);
        if (!isValid) throw new UnauthorizedException("Login yoki parol noto'g'ri");
        return { sub: login, role: 'admin' };
    }

    sign(payload: AuthPayload): { token: string; ttl: number } {
        const ttl = Number(this.config.get<string>('JWT_TTL', '86400'));
        const token = this.jwt.sign(payload, {
            secret: this.config.get<string>('JWT_SECRET'),
            expiresIn: ttl,
        });
        return { token, ttl };
    }
}
