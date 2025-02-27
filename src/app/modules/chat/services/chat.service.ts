import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { firstValueFrom, lastValueFrom, Observable, Subject } from 'rxjs';
import { IHRole, PartHistory, TypePartEnum } from '../interfaces/history.model';

import { toObservable } from '@angular/core/rxjs-interop';
import { NotifyService } from '../../../shared/services/notify.service';
import { AiEngineEnum } from '../enums/ai-engine.enum';
import { IChat } from '../interfaces/chat.model';
import { StateMessageWSEnum } from '../interfaces/socket.model';
import { SocketService } from './socket.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
    providedIn: 'root',
})
export class ChatService {
    constructor() {
        this.notifyService = inject(NotifyService);
        this.socketService = inject(SocketService);
        this.translateService = inject(TranslateService);

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
     * @description Notify service for show messages to user
     */
    private notifyService: NotifyService;

    /**
     * @description Socket service managing connection
     */
    private socketService: SocketService;

    /**
     * @description Translate service for translate messages
     */
    private translateService: TranslateService;

    /**
     * @description Subject to dispatch chat chunk
     */
    private dispathChatChunk: Subject<string>;

    /**
     * @description Signal to dispatch chat list
     */
    private dispathChatList: WritableSignal<IChat[]>;

    /**
     * @description Signal to dispatch chat id selected
     */
    private dispathChatSelect: WritableSignal<string>;

    /**
     * @description Signal to dispatch AI engine
     */
    private dispatchAiEngine: WritableSignal<AiEngineEnum>;

    /**
     * @description Signal to dispatch if is streaming a chat server response
     */
    private dispatchIsStreaming: WritableSignal<boolean>;

    /**
     * @description Listen message from socket service
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
     * @description Observable to get chat chunk
     */
    chatChunkStream: Observable<string>;

    /**
     * @description Observable to get chat list
     */
    chatList: Observable<IChat[]>;

    /**
     * @description Observable to get chat select
     */
    chatSelect: Observable<string>;

    /**
     * @description Observable to get AI engine
     */
    aiEngine: Observable<AiEngineEnum>;

    /**
     * @description Observable to get if is streaming
     */
    isStreaming: Observable<boolean>;

    /**
     * @description Select a chat by chat id
     *
     * @param chatId chat id to chat to select
     */
    selectChat(chatId: string): void {
        if (this.dispatchIsStreaming()) {
            const textTranslation = this.translateService.instant(
                'chat.chat-list.cant-change-chat-while-streaming'
            );
            this.notifyService.warning(textTranslation);
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
     * @description Select a ai engine
     *
     * @param engine AI engine enum selected
     */
    async setAiEngine(engine: AiEngineEnum): Promise<void> {
        if (this.dispatchIsStreaming()) {
            const textTranslation = this.translateService.instant(
                'chat.chat-list.cant-change-model-while-streaming'
            );
            this.notifyService.warning(textTranslation);
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
            const textTranslation = this.translateService.instant(
                'chat.chat-list.cant-change-model-started-chat'
            );
            this.notifyService.warning(textTranslation);
            return;
        }

        chatSelected.aiEngine = engine;

        this.dispatchAiEngine.set(engine);
    }

    /**
     * @description Add a chat to chat list and select it
     */
    async addChat(): Promise<void> {
        if (this.dispatchIsStreaming()) {
            const textTranslation = this.translateService.instant(
                'chat.chat-list.cant-add-chat-while-streaming'
            );
            this.notifyService.warning(textTranslation);
            return;
        }

        if (this.dispathChatList().length) {
            if (
                !this.dispathChatList()[this.dispathChatList().length - 1]
                    .history.length
            ) {
                const textTranslation = this.translateService.instant(
                    'chat.chat-list.cant-add-conversation-before-start-chat'
                );
                this.notifyService.error(textTranslation);
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
     * @description Starts chat-conversation
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
     * @description Send user message to current chat history conversation
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
