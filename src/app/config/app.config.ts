import { ApplicationConfig, importProvidersFrom } from '@angular/core';

import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { providers } from './app.providers';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        provideClientHydration(),
        importProvidersFrom(providers),
    ],
};
