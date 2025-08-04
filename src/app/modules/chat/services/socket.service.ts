import { inject, Injectable, Signal, signal, WritableSignal } from '@angular/core';
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
    /**
     * @description Socket instance for managing connection
     */
    private socket: Socket = inject(Socket);

    /**
     * @description Signal for dispatching message
     */
    private dispatchMessage: Subject<IMessageWSResponse> = new Subject<IMessageWSResponse>();

    /**
     * @description Timer for ping socket server
     */
    private timerPing: number = 0;

    /**
     * @description Listen to the socket events
     */
    private listenSocketServerEvents(): void {
        this.socket
            .fromEvent<IGlobalWSRequestResponse<IMessageWSResponse>, string>('message')
            .subscribe((response) => {
                this.dispatchMessage.next(response.payload);
            });

        this.socket.fromEvent('connect').subscribe(() => {
            this.dpIsConnected.update(() => true);
            this.triggerPing();
        });

        this.socket.fromEvent('disconnect').subscribe(() => {
            this.dpIsConnected.update(() => false);

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
    private dpIsConnected: WritableSignal<boolean> = signal<boolean>(false);

    /**
     * @description Readonly signal for the current connection status
     */
    public readonly isConnected: Signal<boolean> =
        this.dpIsConnected.asReadonly();

    /**
     * @description Listen to the message from the socket server
     */
    public listenMessage: Observable<IMessageWSResponse> = this.dispatchMessage.asObservable();

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
