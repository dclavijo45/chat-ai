import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { IHRole, PartHistory, TypePartEnum } from '../interfaces/history.model';

import { TranslateService } from '@ngx-translate/core';
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
        this.translateService = inject(TranslateService);

        this.dispathChatChunk = new Subject<string>();
        this.chatChunkStream = this.dispathChatChunk.asObservable();

        this.chatList = signal<IChat[]>([]);
        this.chatSelect = signal('');
        this.aiEngine = signal(AiEngineEnum.grok);
        this.isStreaming = signal(false);

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
    public chatList: WritableSignal<IChat[]>;

    /**
     * @description Signal to dispatch chat id selected
     */
    public chatSelect: WritableSignal<string>;

    /**
     * @description Signal to dispatch AI engine
     */
    public aiEngine: WritableSignal<AiEngineEnum>;

    /**
     * @description Signal to dispatch if is streaming a chat server response
     */
    public isStreaming: WritableSignal<boolean>;

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
                this.isStreaming.set(false);

                const chatList = this.chatList();
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
     * @description Select a chat by chat id
     *
     * @param chatId chat id to chat to select
     */
    selectChat(chatId: string): void {
        if (this.isStreaming()) {
            const textTranslation = this.translateService.instant(
                'chat.chat-list.cant-change-chat-while-streaming'
            );
            this.notifyService.warning(textTranslation);
            return;
        }

        if (this.chatSelect() == chatId) return;

        const chatList = this.chatList.asReadonly()();

        const chatSelected = chatList.find((chat) => chat.id == chatId);

        if (!chatSelected) {
            return;
        }

        this.chatSelect.set(chatId);

        if (chatSelected.history.length) {
            this.aiEngine.set(chatSelected.aiEngine);
        }
    }

    /**
     * @description Select a ai engine
     *
     * @param engine AI engine enum selected
     */
    async setAiEngine(engine: AiEngineEnum): Promise<void> {
        if (this.isStreaming()) {
            const textTranslation = this.translateService.instant(
                'chat.chat-list.cant-change-model-while-streaming'
            );
            this.notifyService.warning(textTranslation);
            return;
        }

        const chatList = this.chatList();

        const chatSelected = chatList.find(
            (chat) => chat.id == this.chatSelect()
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

        this.aiEngine.set(engine);
    }

    /**
     * @description Add a chat to chat list and select it
     */
    async addChat(): Promise<void> {
        if (this.isStreaming()) {
            const textTranslation = this.translateService.instant(
                'chat.chat-list.cant-add-chat-while-streaming'
            );
            this.notifyService.warning(textTranslation);
            return;
        }

        if (this.chatList().length) {
            if (!this.chatList()[this.chatList().length - 1].history.length) {
                const textTranslation = this.translateService.instant(
                    'chat.chat-list.cant-add-conversation-before-start-chat'
                );
                this.notifyService.error(textTranslation);
                return;
            }
        }

        const chatId = crypto.randomUUID();

        this.chatList.update((value) => {
            value.push({
                history: [],
                id: chatId,
                aiEngine: this.aiEngine(),
            });

            return value;
        });

        this.chatSelect.set(chatId);
    }

    /**
     * @description Starts chat-conversation
     *
     * @param parts user messages to send to AI
     */
    async startChatWs(parts: PartHistory[]): Promise<void> {
        return new Promise<void>(async (resolve) => {
            let chatSelected: IChat | undefined;

            this.chatList.update((chatList) => {
                chatSelected = chatList.find(
                    (chat) => chat.id == this.chatSelect()
                );

                if (!chatSelected) return chatList;

                chatSelected.history.push(
                    {
                        role: IHRole.user,
                        parts,
                    },
                    {
                        role: IHRole.model,
                        parts: [
                            {
                                type: TypePartEnum.text,
                                text: '',
                            },
                        ],
                    }
                );

                return chatList;
            });

            if (!chatSelected) return resolve();

            this.chatList.set([...this.chatList()]);

            this.isStreaming.set(true);
            this.dispathChatChunk.next('...');

            this.socketService.sendMessages({
                history: chatSelected.history.slice(0, -1),
                aiEngine: this.aiEngine(),
                conversationId: chatSelected.id,
            });

            resolve();
        });
    }

    /**
     * @description Send user message to current chat history conversation
     *
     * @param parts user messages to send to AI
     */
    async conversationWs(parts: PartHistory[]): Promise<void> {
        return new Promise<void>(async (resolve) => {
            let chatSelected: IChat | undefined;

            this.chatList.update((chatList) => {
                chatSelected = chatList.find(
                    (chat) => chat.id == this.chatSelect()
                );

                if (!chatSelected) return chatList;

                chatSelected.history.push(
                    {
                        role: IHRole.user,
                        parts,
                    },
                    {
                        role: IHRole.model,
                        parts: [
                            {
                                type: TypePartEnum.text,
                                text: '',
                            },
                        ],
                    }
                );

                return chatList;
            });

            if (!chatSelected) return resolve();

            this.isStreaming.set(true);
            this.dispathChatChunk.next('...');

            this.socketService.sendMessages({
                history: chatSelected.history.slice(0, -1),
                aiEngine: this.aiEngine(),
                conversationId: chatSelected.id,
            });

            resolve();
        });
    }
}
