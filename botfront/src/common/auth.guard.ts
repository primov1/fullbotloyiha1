import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { parseCookies } from './cookie.util';

export const AUTH_COOKIE = 'admin_token';

export interface AuthPayload {
    sub: string;
    role: 'admin';
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
    constructor(
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<Request>();
        const res = context.switchToHttp().getResponse<Response>();
        const cookies = parseCookies(req.headers?.cookie);
        const token = cookies[AUTH_COOKIE];

        if (!token) {
            res.redirect('/login');
            return false;
        }
        try {
            const payload = this.jwt.verify<AuthPayload>(token, {
                secret: this.config.get<string>('JWT_SECRET'),
            });
            (req as any).admin = payload;
            return true;
        } catch {
            res.clearCookie(AUTH_COOKIE);
            res.redirect('/login');
            return false;
        }
    }
}
