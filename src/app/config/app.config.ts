import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';

import {
    provideHttpClient,
    withFetch,
    withInterceptorsFromDi,
} from '@angular/common/http';
import { provideClientHydration, withEventReplay, withIncrementalHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { providers } from './app.providers';
import { routes } from './app.routes';
import { provideMarkdown } from 'ngx-markdown';

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideClientHydration(withIncrementalHydration(), withEventReplay()),
        importProvidersFrom(providers),
        provideHttpClient(withFetch(), withInterceptorsFromDi()),
        provideMarkdown()
    ],
};
