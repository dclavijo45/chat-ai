import { afterNextRender, Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';

import { ThemeColorEnum } from '../enums/theme-color.enum';

@Injectable({
    providedIn: 'root',
})
export class ThemeColorService {
    constructor() {
        this.dispathThemeColor = new BehaviorSubject<ThemeColorEnum>(
            ThemeColorEnum.light
        );

        this.themeColor = this.dispathThemeColor.asObservable();

        afterNextRender(() => {
            const darkModeMQ = window.matchMedia(
                '(prefers-color-scheme: dark)'
            );

            this.dispathThemeColor.next(
                darkModeMQ.matches ? ThemeColorEnum.dark : ThemeColorEnum.light
            );

            darkModeMQ.addEventListener('change', (event) => {
                this.toggleThemeColor(event);
            });
        });
    }

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
            return this.dispathThemeColor.next(
                event.matches ? ThemeColorEnum.dark : ThemeColorEnum.light
            );
        }

        const currentTheme = await firstValueFrom(this.themeColor);

        this.dispathThemeColor.next(
            currentTheme == ThemeColorEnum.dark
                ? ThemeColorEnum.light
                : ThemeColorEnum.dark
        );
    }
}
