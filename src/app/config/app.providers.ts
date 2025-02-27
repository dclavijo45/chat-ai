import { HttpClient } from '@angular/common/http';
import { ImportProvidersSource } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { SocketIoModule } from 'ngx-socket-io';
import { environment } from '../../environments/environtment';
import { httpLoaderFactory } from '../shared/loaders/http-factory.loader';

export const providers: ImportProvidersSource[] = [
    SocketIoModule.forRoot({
        url: environment.socket_config.url,
        options: {
            autoConnect: false,
            transports: ['websocket'],
        },
    }),
    TranslateModule.forRoot({
        loader: {
            provide: TranslateLoader,
            useFactory: httpLoaderFactory,
            deps: [HttpClient],
        },
    }),
];
