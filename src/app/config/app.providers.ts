import {ImportProvidersSource} from '@angular/core';
import {SocketIoModule} from 'ngx-socket-io';
import {environment} from '../../environments/environtment';

export const providers: ImportProvidersSource[] = [
    SocketIoModule.forRoot({
        url: environment.socket_config.url,
        options: {
            autoConnect: false,
            transports: ['websocket'],
        },
    }),
];
