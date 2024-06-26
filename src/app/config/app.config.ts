import { ApplicationConfig, importProvidersFrom } from '@angular/core';

import {
    provideHttpClient,
    withInterceptorsFromDi,
} from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { providers } from './app.providers';
import { routes } from './app.routes';
import { provideMarkdown } from 'ngx-markdown';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        provideClientHydration(),
        importProvidersFrom(providers),
        provideHttpClient(withInterceptorsFromDi()),
        provideMarkdown()
    ],
};
