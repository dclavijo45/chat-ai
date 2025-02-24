import {
    Injectable,
    WritableSignal,
    inject,
    signal
} from '@angular/core';
import { Observable, Subject } from 'rxjs';
import {
    IHRole,
    PartHistory,
    TypePartEnum
} from '../interfaces/history.model';

import { toObservable } from '@angular/core/rxjs-interop';
import { NotifyService } from '../../../shared/services/notify.service';
import { AiEngineEnum } from '../enums/ai-engine.enum';
import { IChat } from '../interfaces/chat.model';
import { StateMessageWSEnum } from '../interfaces/socket.model';
import { SocketService } from './socket.service';

@Injectable({
    providedIn: 'root',
})
export class ChatService {
    constructor() {
        this.notifyService = inject(NotifyService);
        this.socketService = inject(SocketService);

        this.dispathChatChunk = new Subject<string>();
        this.chatChunkStream = this.dispathChatChunk.asObservable();

        this.dispathChatList = signal<IChat[]>([]);
        this.chatList = toObservable(this.dispathChatList);

        this.dispathChatSelect = signal('');
        this.chatSelect = toObservable(this.dispathChatSelect);

        this.dispatchAiEngine = signal(AiEngineEnum.deepseek);
        this.aiEngine = toObservable(this.dispatchAiEngine);

        this.dispatchIsStreaming = signal(false);
        this.isStreaming = toObservable(this.dispatchIsStreaming);

        this.listenMessage();
    }

    /**
     * Notify service for show messages to user
     */
    private notifyService: NotifyService;

    /**
     * @description Socket service managing connection
     */
    private socketService: SocketService;

    /**
     * Subject to dispatch chat chunk
     */
    private dispathChatChunk: Subject<string>;

    /**
     * Signal to dispatch chat list
     */
    private dispathChatList: WritableSignal<IChat[]>;

    /**
     * Signal to dispatch chat id selected
     */
    private dispathChatSelect: WritableSignal<string>;

    /**
     * Signal to dispatch AI engine
     */
    private dispatchAiEngine: WritableSignal<AiEngineEnum>;

    /**
     * Signal to dispatch if is streaming a chat server response
     */
    private dispatchIsStreaming: WritableSignal<boolean>;

    /**
     * Listen message from socket service
     */
    private listenMessage(): void {
        // store chunk message temporary
        let tempChunk = '';

        this.socketService.listenMessage.subscribe((message) => {
            if (message.state == StateMessageWSEnum.START) {
                return;
            }

            tempChunk += message.messageChunk;
            this.dispathChatChunk.next(tempChunk);

            if (message.state == StateMessageWSEnum.STREAMING) {
                return;
            }

            if (message.state == StateMessageWSEnum.END_STREAMING) {
                this.dispatchIsStreaming.set(false);

                const chatList = this.dispathChatList();
                const chatSelected = chatList.find(
                    (chatE) => chatE.id == message.conversationId
                );

                if (!chatSelected) return;

                chatSelected.history[
                    chatSelected.history.length - 1
                ].parts[0].text = JSON.parse(JSON.stringify(tempChunk));

                tempChunk = '';
                this.dispathChatChunk.next('');
                return;
            }
        });
    }

    /**
     * Observable to get chat chunk
     */
    chatChunkStream: Observable<string>;

    /**
     * Observable to get chat list
     */
    chatList: Observable<IChat[]>;

    /**
     * Observable to get chat select
     */
    chatSelect: Observable<string>;

    /**
     * Observable to get AI engine
     */
    aiEngine: Observable<AiEngineEnum>;

    /**
     * Observable to get if is streaming
     */
    isStreaming: Observable<boolean>;

    /**
     * Select a chat by chat id
     *
     * @param chatId chat id to chat to select
     */
    selectChat(chatId: string): void {
        if (this.dispatchIsStreaming()) {
            this.notifyService.warning(
                'No puedes cambiar de chat mientras está en espera de respuesta'
            );
            return;
        }

        if (this.dispathChatSelect() == chatId) return;

        const chatList = this.dispathChatList.asReadonly()();

        const chatSelected = chatList.find((chat) => chat.id == chatId);

        if (!chatSelected) {
            return;
        }

        this.dispathChatSelect.set(chatId);

        if (chatSelected.history.length) {
            this.dispatchAiEngine.set(chatSelected.aiEngine);
        }
    }

    /**
     * Select a ai engine
     *
     * @param engine AI engine enum selected
     */
    setAiEngine(engine: AiEngineEnum): void {
        if (this.dispatchIsStreaming()) {
            this.notifyService.warning(
                'No puedes cambiar de modelo mientras está en espera de respuesta'
            );
            return;
        }

        const chatList = this.dispathChatList();

        const chatSelected = chatList.find(
            (chat) => chat.id == this.dispathChatSelect()
        );

        if (!chatSelected) {
            return;
        }

        if (chatSelected.history.length) {
            this.notifyService.warning(
                'No puedes cambiar de modelo ai en una conversación ya comenzada'
            );
            return;
        }

        chatSelected.aiEngine = engine;

        this.dispatchAiEngine.set(engine);
    }

    /**
     * Add a chat to chat list and select it
     */
    addChat(): void {
        if (this.dispatchIsStreaming()) {
            this.notifyService.warning(
                'No puedes agregar un chat mientras está en espera de respuesta'
            );
            return;
        }

        if (this.dispathChatList().length) {
            if (
                !this.dispathChatList()[this.dispathChatList().length - 1]
                    .history.length
            ) {
                this.notifyService.error(
                    'No puedes agregar un chat hasta que el chat actual haya comenzado'
                );
                return;
            }
        }

        const chatId = crypto.randomUUID();

        this.dispathChatList.update((value) => {
            value.push({
                history: [],
                id: chatId,
                aiEngine: this.dispatchAiEngine(),
            });

            return value;
        });

        this.dispathChatSelect.set(chatId);
    }

    /**
     * Starts chat-conversation
     *
     * @param parts user messages to send to AI
     */
    async startChatWs(parts: PartHistory[]): Promise<void> {
        return new Promise<void>(async (resolve) => {
            const chatList: IChat[] = this.dispathChatList();

            const chatSelected = chatList.find(
                (chatE) => chatE.id == this.dispathChatSelect()
            );

            if (!chatSelected) return resolve();

            this.dispatchIsStreaming.set(true);

            chatSelected.history.push({
                role: IHRole.user,
                parts,
            });

            chatSelected.history.push({
                role: IHRole.model,
                parts: [
                    {
                        type: TypePartEnum.text,
                        text: '',
                    },
                ],
            });

            this.dispathChatList.set(chatList);

            this.dispathChatChunk.next('...');

            this.socketService.sendMessages({
                history: chatSelected.history.slice(0, -1),
                aiEngine: this.dispatchAiEngine(),
                conversationId: chatSelected.id,
            });
        });
    }

    /**
     * Send user message to current chat history conversation
     *
     * @param parts user messages to send to AI
     */
    async conversationWs(parts: PartHistory[]): Promise<void> {
        return new Promise<void>(async (resolve) => {
            const chatList: IChat[] = this.dispathChatList();

            const chatHistory = chatList.find(
                (chatL) => chatL.id == this.dispathChatSelect()
            );

            if (!chatHistory) return resolve();

            this.dispatchIsStreaming.set(true);

            chatHistory.history.push({
                role: IHRole.user,
                parts,
            });

            chatHistory.history.push({
                role: IHRole.model,
                parts: [
                    {
                        type: TypePartEnum.text,
                        text: '',
                    },
                ],
            });

            this.dispathChatList.set(chatList);

            this.dispathChatChunk.next('...');

            this.socketService.sendMessages({
                history: chatHistory.history.slice(0, -1),
                aiEngine: this.dispatchAiEngine(),
                conversationId: chatHistory.id,
            });
        });
    }
}
