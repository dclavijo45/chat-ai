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
        const themeColorStore = this.cookieService.get('theme_color');

        afterNextRender(() => {
            const darkModeMQ = window.matchMedia(
                '(prefers-color-scheme: dark)'
            );

            if (!themeColorStore) {
                this.dpThemeColor.set(
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
    private cookieService: CookieService = inject(CookieService);

    /**
     * @description Signal for theme color
     */
    private dpThemeColor: WritableSignal<ThemeColorEnum> = signal<ThemeColorEnum>(
            this.cookieService.get('theme_color') == ThemeColorEnum.dark
                ? ThemeColorEnum.dark
                : ThemeColorEnum.light
        );


    /**
     * @description Readonly signal for the current theme color
     */
    public readonly themeColor = this.dpThemeColor.asReadonly();

    /**
     * @description Toggle theme color between light and dark
     * @param event media query list event
     */
    async toggleThemeColor(event?: MediaQueryListEvent): Promise<void> {
        if (event) {
            this.cookieService.set(
                'theme_color',
                event.matches ? ThemeColorEnum.dark : ThemeColorEnum.light,
                365
            );
            return this.dpThemeColor.set(
                event.matches ? ThemeColorEnum.dark : ThemeColorEnum.light
            );
        }

        this.cookieService.set(
            'theme_color',
            this.dpThemeColor() == ThemeColorEnum.dark
                ? ThemeColorEnum.light
                : ThemeColorEnum.dark,
            365
        );
        this.dpThemeColor.set(
            this.dpThemeColor() == ThemeColorEnum.dark
                ? ThemeColorEnum.light
                : ThemeColorEnum.dark
        );
    }
}
