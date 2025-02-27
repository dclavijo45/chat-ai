import { afterNextRender, inject, Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';

import { ThemeColorEnum } from '../enums/theme-color.enum';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
    providedIn: 'root',
})
export class ThemeColorService {
    constructor() {
        this.cookieService = inject(CookieService);

        const themeColorStore = this.cookieService.get('theme_color');

        this.dispathThemeColor = new BehaviorSubject<ThemeColorEnum>(
            themeColorStore == ThemeColorEnum.dark
                ? ThemeColorEnum.dark
                : ThemeColorEnum.light
        );

        this.themeColor = this.dispathThemeColor.asObservable();

        afterNextRender(() => {
            const darkModeMQ = window.matchMedia(
                '(prefers-color-scheme: dark)'
            );

            if (!themeColorStore) {
                this.dispathThemeColor.next(
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
     * @description Signal for dispatching theme color
     */
    private dispathThemeColor: BehaviorSubject<ThemeColorEnum>;

    /**
     * @description Observable for theme color
     */
    themeColor: Observable<ThemeColorEnum>;

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
            return this.dispathThemeColor.next(
                event.matches ? ThemeColorEnum.dark : ThemeColorEnum.light
            );
        }

        const currentTheme = await firstValueFrom(this.themeColor);

        this.cookieService.set(
            'theme_color',
            currentTheme == ThemeColorEnum.dark
                ? ThemeColorEnum.light
                : ThemeColorEnum.dark
        );
        this.dispathThemeColor.next(
            currentTheme == ThemeColorEnum.dark
                ? ThemeColorEnum.light
                : ThemeColorEnum.dark
        );
    }
}
