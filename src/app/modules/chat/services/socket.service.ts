import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable, Subject } from 'rxjs';
import {
    IGlobalWSRequestResponse,
    IMessageWSRequest,
    IMessageWSResponse,
    IPingPongPayloadRequest,
} from '../interfaces/socket.model';

@Injectable({
    providedIn: 'root',
})
export class SocketService {
    constructor() {
        this.socket = inject(Socket);

        this.dispatchMessage = new Subject<IMessageWSResponse>();
        this.isConnected = signal<boolean>(false);

        this.listenMessage = this.dispatchMessage.asObservable();

        this.timerPing = 0;
    }

    /**
     * @description Socket instance for managing connection
     */
    private socket: Socket;

    /**
     * @description Signal for dispatching message
     */
    private dispatchMessage: Subject<IMessageWSResponse>;

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
                this.dispatchMessage.next(response.payload);
            });

        this.socket.fromEvent('connect').subscribe(() => {
            this.isConnected.update(() => true);
            this.triggerPing();
        });

        this.socket.fromEvent('disconnect').subscribe(() => {
            this.isConnected.update(() => false);

            clearInterval(this.timerPing);
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
        if (this.timerPing) {
            clearInterval(this.timerPing);
            this.timerPing = 0;
        }

        this.timerPing = Number(
            setInterval(() => {
                this.sendPing();
            }, 10000)
        );
    }

    /**
     * @description Signal for dispatching connection status
     */
    public isConnected: WritableSignal<boolean>;

    /**
     * @description Listen to the message from the socket server
     */
    public listenMessage: Observable<IMessageWSResponse>;

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
