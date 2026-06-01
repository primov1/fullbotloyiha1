import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Response } from 'express';
import { ConfirmationsService } from './confirmations.service';
import { AdminProfileService } from '../auth/admin-profile.service';

@Injectable()
export class PendingCountInterceptor implements NestInterceptor {
    constructor(
        private readonly confirmationsService: ConfirmationsService,
        private readonly adminProfileService: AdminProfileService,
    ) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
        if (context.getType() === 'http') {
            const res = context.switchToHttp().getResponse<Response>();
            if (res?.locals) {
                try {
                    res.locals.pendingConfirmations = await this.confirmationsService.pendingCount();
                } catch {
                    res.locals.pendingConfirmations = 0;
                }
                res.locals.adminProfile = this.adminProfileService.getProfile();
            }
        }
        return next.handle();
    }
}
