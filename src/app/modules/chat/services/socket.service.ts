import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import {
    IGlobalWSRequestResponse,
    IMessageWSRequest,
    IMessageWSResponse,
    IPingPongPayloadRequest,
    StateMessageWSEnum,
} from '../interfaces/socket.model';
import { Observable, Subject } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

@Injectable({
    providedIn: 'root',
})
export class SocketService {
    constructor() {
        this.socket = inject(Socket);

        this.dispatchMessage = signal<IMessageWSResponse>({
            conversationId: '',
            messageChunk: '',
            state: StateMessageWSEnum.START,
        });

        this.listenMessage = toObservable(this.dispatchMessage);

        this.timerPing = 0;
    }

    /**
     * @description Socket instance for managing connection
     */
    private socket: Socket;

    /**
     * @description Signal for dispatching message
     */
    private dispatchMessage: WritableSignal<IMessageWSResponse>;

    /**
     * @description Timer for ping socket server
     */
    private timerPing: number;

    /**
     * @description Listen to the socket events
     */
    private listenSocketServerEvents(): void {
        this.socket
            .fromEvent<IGlobalWSRequestResponse<IMessageWSResponse>>('message')
            .subscribe((response) => {
                this.dispatchMessage.update(() => response.payload);
            });

        this.socket.fromEvent('connect').subscribe(() => {
            console.log('connected socket server');

            if (this.timerPing) {
                window.clearInterval(this.timerPing);
                this.timerPing = 0;
            }

            this.triggerPing();
        });

        this.socket.fromEvent('disconnect').subscribe(() => {
            console.log('disconnected socket server');

            window.clearInterval(this.timerPing);
            this.timerPing = 0;
        });
    }

    /**
     * @description Send a ping to the socket server
     */
    private sendPing(): void {
        const request: IGlobalWSRequestResponse<IPingPongPayloadRequest> = {
            payload: {
                message: 'ping',
            },
        };

        this.socket.emit('ping', request);
    }

    /**
     * @description Trigger the ping to the socket server
     */
    private triggerPing(): void {
        this.timerPing = window.setInterval(() => {
            this.sendPing();
        }, 10000);
    }

    /**
     * @description Listen to the message from the socket server
     */
    listenMessage: Observable<IMessageWSResponse>;

    /**
     * @description Connect to the socket server
     */
    connect(): void {
        this.socket.connect();

        this.listenSocketServerEvents();
    }

    /**
     * @description Send messages to socket server
     * @param messages Messages exchanged between the user and the AI engine.
     */
    sendMessages(messages: IMessageWSRequest): void {
        const request: IGlobalWSRequestResponse<IMessageWSRequest> = {
            payload: messages,
        };

        this.socket.emit('message', request);
    }
}
