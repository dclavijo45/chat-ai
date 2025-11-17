import {
    ApplicationConfig,
    importProvidersFrom,
    provideZoneChangeDetection,
} from '@angular/core';

import {
    provideHttpClient,
    withFetch,
    withInterceptorsFromDi,
} from '@angular/common/http';
import {
    provideClientHydration,
    withEventReplay,
    withIncrementalHydration,
} from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { MARKED_OPTIONS, provideMarkdown } from 'ngx-markdown';
import { markdownRendererFactory } from '../shared/factories/markdown-renderer.factory';
import { providers } from './app.providers';
import { routes } from './app.routes';
import { popperVariation, provideTippyConfig, provideTippyLoader, tooltipVariation } from '@ngneat/helipopper/config';
import { initializeApp, provideFirebaseApp } from "@angular/fire/app";
import { getAuth, provideAuth } from "@angular/fire/auth";
import { environment } from "../../environments/environtment";
import { provideTranslateService } from "@ngx-translate/core";
import { provideTranslateHttpLoader } from "@ngx-translate/http-loader";

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({eventCoalescing: true}),
        provideRouter(routes),
        provideClientHydration(withIncrementalHydration(), withEventReplay()),
        importProvidersFrom(providers),
        provideHttpClient(withFetch(), withInterceptorsFromDi()),
        provideMarkdown({
            markedOptions: {
                provide: MARKED_OPTIONS,
                useFactory: markdownRendererFactory
            },
        }),
        provideFirebaseApp(() => initializeApp(environment.firebase)),
        provideAuth(() => getAuth()),
        provideTippyLoader(() => import('tippy.js')),
        provideTippyConfig({
            defaultVariation: 'tooltip',
            variations: {
                tooltip: tooltipVariation,
                popper: popperVariation,
            },
        }),
        provideTranslateService({
            loader: provideTranslateHttpLoader({
                prefix: '/assets/i18n/',
                suffix: '.json'
            }),
            fallbackLang: 'en',
            lang: 'en'
        })
    ],
};
