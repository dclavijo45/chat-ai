import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { Injectable, afterNextRender } from '@angular/core';

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

    private dispathThemeColor: BehaviorSubject<ThemeColorEnum>;

    themeColor: Observable<ThemeColorEnum>;

    async toggleThemeColor(event?: MediaQueryListEvent): Promise<void> {
        if (event) {
            return this.dispathThemeColor.next(
                event.matches ? ThemeColorEnum.dark : ThemeColorEnum.light
            );
        }

        let $: Subscription;

        const currentTheme = await new Promise<ThemeColorEnum>((resolve) => {
            $ = this.themeColor.subscribe((themeC) => resolve(themeC));
        });

        $!.unsubscribe();

        this.dispathThemeColor.next(
            currentTheme == ThemeColorEnum.dark
                ? ThemeColorEnum.light
                : ThemeColorEnum.dark
        );
    }
}
