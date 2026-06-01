import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import hbs from 'hbs';
import { AppModule } from './app.module';

let handler: ReturnType<typeof Function.prototype.call> | undefined;

async function createHandler() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    const root = join(__dirname, '..');
    app.useStaticAssets(join(root, 'public'));
    app.setBaseViewsDir(join(root, 'views'));
    app.setViewEngine('hbs');
    app.set('view options', { layout: 'layouts/main' });
    hbs.registerPartials(join(root, 'views', 'partials'));

    hbs.registerHelper('eq', (a: unknown, b: unknown) => a === b);
    hbs.registerHelper('ne', (a: unknown, b: unknown) => a !== b);
    hbs.registerHelper('gt', (a: unknown, b: unknown) => Number(a) > Number(b));
    hbs.registerHelper('json', (ctx: unknown) => JSON.stringify(ctx));
    hbs.registerHelper('formatPrice', (value: number) => {
        if (typeof value !== 'number') return value;
        return new Intl.NumberFormat('uz-UZ').format(value);
    });
    hbs.registerHelper('formatDate', (value: Date | string | undefined) => {
        if (!value) return '-';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '-';
        return d.toLocaleString('uz-UZ', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
    });
    hbs.registerHelper('inc', (value: number) => Number(value) + 1);

    await app.init();
    return app.getHttpAdapter().getInstance();
}

export default async (req: any, res: any) => {
    if (!handler) handler = await createHandler();
    (handler as any)(req, res);
};
