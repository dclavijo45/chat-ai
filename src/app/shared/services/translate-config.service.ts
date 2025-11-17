import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { i18nConstant } from '../constants/i18n.constant';

@Injectable({
    providedIn: 'root',
})
export class TranslateConfigService {
    constructor() {
        this.cookieService = inject(CookieService);
        this.translateService = inject(TranslateService);
    }

    /**
     * @description Service to manage cookies
     */
    private cookieService: CookieService;

    /**
     * @description Service to manage translations
     */
    private translateService: TranslateService;

    /**
     * @description Configure translate service with default language and languages list
     */
    setUp(): void {
        this.translateService.addLangs(
            i18nConstant.LANGUAGES.map((language) => language.code)
        );

        const language = this.cookieService.get(
            i18nConstant.LANGUAGE_STORAGE_KEY
        );

        if (language) {
            this.translateService.use(language);
        }

        if (!language) {
            const browserLang = this.translateService.getBrowserLang();

            if (i18nConstant.LANGUAGES.find((lang) => lang.code === browserLang)) {
                this.translateService.use(browserLang!);
            } else {
                this.translateService.use(i18nConstant.DEFAULT_LANGUAGE.code);
            }
        }

        this.translateService.onLangChange.subscribe((event) => {
            this.cookieService.set(
                i18nConstant.LANGUAGE_STORAGE_KEY,
                event.lang
            );
        });
    }
}
