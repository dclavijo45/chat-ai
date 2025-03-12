import {
    afterNextRender,
    inject,
    Injectable,
    signal,
    WritableSignal,
} from '@angular/core';

import { CookieService } from 'ngx-cookie-service';
import { ThemeColorEnum } from '../enums/theme-color.enum';

@Injectable({
    providedIn: 'root',
})
export class ThemeColorService {
    constructor() {
        this.cookieService = inject(CookieService);

        const themeColorStore = this.cookieService.get('theme_color');

        this.themeColor = signal<ThemeColorEnum>(
            themeColorStore == ThemeColorEnum.dark
                ? ThemeColorEnum.dark
                : ThemeColorEnum.light
        );

        afterNextRender(() => {
            const darkModeMQ = window.matchMedia(
                '(prefers-color-scheme: dark)'
            );

            if (!themeColorStore) {
                this.themeColor.set(
                    darkModeMQ.matches
                        ? ThemeColorEnum.dark
                        : ThemeColorEnum.light
                );
            }

            darkModeMQ.addEventListener('change', (event) => {
                this.toggleThemeColor(event);
            });
        });
    }

    /**
     * @description Cookie service for manage cookies
     */
    private cookieService: CookieService;

    /**
     * @description Signal for theme color
     */
    themeColor: WritableSignal<ThemeColorEnum>;

    /**
     * @description Toggle theme color between light and dark
     * @param event media query list event
     */
    async toggleThemeColor(event?: MediaQueryListEvent): Promise<void> {
        if (event) {
            this.cookieService.set(
                'theme_color',
                event.matches ? ThemeColorEnum.dark : ThemeColorEnum.light
            );
            return this.themeColor.set(
                event.matches ? ThemeColorEnum.dark : ThemeColorEnum.light
            );
        }

        this.cookieService.set(
            'theme_color',
            this.themeColor() == ThemeColorEnum.dark
                ? ThemeColorEnum.light
                : ThemeColorEnum.dark
        );
        this.themeColor.set(
            this.themeColor() == ThemeColorEnum.dark
                ? ThemeColorEnum.light
                : ThemeColorEnum.dark
        );
    }
}
