import { afterNextRender, inject, Injectable, Signal, signal, WritableSignal, } from '@angular/core';
import { IHRole, PartHistory, TypePartEnum } from '../interfaces/history.model';

import { TranslateService } from '@ngx-translate/core';
import { NotifyService } from '../../../shared/services/notify.service';
import { AiEngineEnum } from '../enums/ai-engine.enum';
import { IChat } from '../interfaces/chat.model';
import { StateMessageWSEnum } from '../interfaces/socket.model';
import { SocketService } from './socket.service';
import { AuthService } from "./auth.service";

@Injectable({
    providedIn: 'root',
})
export class ChatService {
    constructor() {
        this.listenMessage();

        afterNextRender(() => {
            this.loadStoredChats();
            this.getPermissionStoreChats();
        });
    }

    /**
     * @description Notify service for show messages to user
     */
    private notifyService: NotifyService = inject(NotifyService);

    /**
     * @description Socket service managing connection
     */
    private socketService: SocketService = inject(SocketService);

    /**
     * @description Translate service for translate messages
     */
    private translateService: TranslateService = inject(TranslateService);

    /**
     * @description Auth service for user authentication
     */
    private authService: AuthService = inject(AuthService);

    /**
     * @description Signal to dispatch chat list
     */
    private dpChatList: WritableSignal<IChat[]> = signal<IChat[]>([]);

    /**
     * @description Signal to dispatch chat id selected
     */
    private dpChatSelect: WritableSignal<string> = signal<string>('');

    /**
     * @description Signal to dispatch AI engine
     */
    private dpAiEngine: WritableSignal<AiEngineEnum> = signal<AiEngineEnum>(
        AiEngineEnum.openai
    );

    /**
     * @description Signal to dispatch if is streaming a chat server response
     */
    private dpIsStreaming: WritableSignal<boolean> = signal<boolean>(false);

    /**
     * @description Signal to get chat chunk
     */
    private dpChatChunkStream: WritableSignal<string> = signal<string>('');

    /**
     * @description Signal to get permission to store chats from local storage
     */
    private dpAllowStoreChats: WritableSignal<boolean> = signal<boolean>(false);

    /**
     * @description Readonly signal for the current chat id selected
     */
    public readonly chatSelect: Signal<string> = this.dpChatSelect.asReadonly();

    /**
     * @description Readonly signal for the current AI engine
     */
    public readonly aiEngine: Signal<AiEngineEnum> =
        this.dpAiEngine.asReadonly();

    /**
     * @description Readonly signal for the current streaming state
     */
    public readonly isStreaming: Signal<boolean> =
        this.dpIsStreaming.asReadonly();

    /**
     * @description Readonly signal for the current chat list
     */
    public readonly chatList: Signal<IChat[]> = this.dpChatList.asReadonly();

    /**
     * @description Readonly signal for the current chat chunk
     */
    public readonly chatChunkStream: Signal<string> =
        this.dpChatChunkStream.asReadonly();

    /**
     * @description Readonly signal for the current permission to store chats
     */
    public readonly allowStoreChats: Signal<boolean> =
        this.dpAllowStoreChats.asReadonly();

    /**
     * @description Listen message from socket service
     */
    private listenMessage(): void {
        this.socketService.listenMessage.subscribe((message) => {
            this.dpChatChunkStream.update(
                (chunk) => chunk + message.messageChunk
            );

            if (message.state == StateMessageWSEnum.STREAMING) {
                return;
            }

            if (message.state == StateMessageWSEnum.END_STREAMING) {
                this.dpIsStreaming.set(false);

                const chatList = this.chatList();
                const chatSelected = chatList.find(
                    (chatE) => chatE.id == message.conversationId
                );

                if (!chatSelected) return;

                chatSelected.history[
                chatSelected.history.length - 1
                    ].parts[0].text = JSON.parse(
                    JSON.stringify(this.chatChunkStream())
                );

                this.dpChatChunkStream.set('');
                this.saveChatsStorage();
            }
        });
    }

    /**
     * @description Save chats to local storage
     */
    private saveChatsStorage(): void {
        if (!this.allowStoreChats()) return;

        localStorage.setItem('chatList', JSON.stringify(this.chatList()));
    }

    /**
     * @description Check permission to store chats from local storage
     */
    private getPermissionStoreChats(): void {
        const allowStoreChats = localStorage.getItem('allowStoreChats');

        this.dpAllowStoreChats.set(allowStoreChats == '1');
    }

    /**
     * @description Load stored chats from local storage
     *  (Called from component for change detection)
     */
    loadStoredChats(): void {
        const chatList = localStorage.getItem('chatList');

        if (chatList) {
            this.dpChatList.set(JSON.parse(chatList));
        }
    }

    /**
     * @description Clean chat list and chat select from memory and local storage
     */
    cleanChatList(): void {
        if (!this.chatList().length || this.isStreaming()) return;

        this.dpChatList.set([]);
        this.dpChatSelect.set('');

        localStorage.removeItem('chatList');
    }

    /**
     * @description Toggle permission to store chats
     */
    toggleStoreChatsPermission(): void {
        const allowStoreChats = this.allowStoreChats();

        localStorage.setItem(
            'allowStoreChats',
            Number(!allowStoreChats).toString()
        );

        this.dpAllowStoreChats.set(!allowStoreChats);
    }

    /**
     * @description Remove chat from chat list
     * @param chat Chat to remove
     */
    removeChat(chat: IChat): void {
        if (this.isStreaming() && this.chatSelect() == chat.id) {
            const textTranslation = this.translateService.instant(
                'chat.chat-list.cant-remove-chat-while-streaming'
            );
            this.notifyService.warning(textTranslation);
            return;
        }

        this.dpChatList.update((value) => {
            const index = value.findIndex((chatE) => chatE.id == chat.id);

            if (index == -1) return value;

            value.splice(index, 1);

            return value;
        });

        if (this.chatSelect() == chat.id) {
            this.dpChatSelect.set('');
        }

        this.saveChatsStorage();
    }

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

        const chatList = this.dpChatList.asReadonly()();

        const chatSelected = chatList.find((chat) => chat.id == chatId);

        if (!chatSelected) {
            return;
        }

        this.dpChatSelect.set(chatId);

        if (chatSelected.history.length) {
            this.dpAiEngine.set(chatSelected.aiEngine);
        }
    }

    /**
     * @description Select a ai engine
     *
     * @param engine AI engine enum selected
     */
    setAiEngine(engine: AiEngineEnum): void {
        if (this.isStreaming()) {
            const textTranslation = this.translateService.instant(
                'chat.chat-list.cant-change-model-while-streaming'
            );
            this.notifyService.warning(textTranslation);
            return;
        }

        if (!this.chatSelect()) {
            this.dpAiEngine.set(engine);
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

        this.dpAiEngine.set(engine);
    }

    /**
     * @description Add a chat to chat list and select it
     */
    addChat(): void {
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

        this.dpChatList.update((value) => {
            value.push({
                history: [],
                id: chatId,
                aiEngine: this.aiEngine(),
            });

            return value;
        });

        this.dpChatSelect.set(chatId);
    }

    /**
     * @description Starts chat-conversation
     *
     * @param parts user messages to send to AI
     */
    async startChatWs(parts: PartHistory[]): Promise<void> {
        if (this.authService.listenUserAuthenticated() === null) {
            const textTranslation = this.translateService.instant(
                'chat.chat-list.user-not-authenticated'
            );
            this.notifyService.error(textTranslation);
            return;
        }

        let chatSelected: IChat | undefined;

        if (!this.chatSelect()) {
            this.addChat();
        }

        this.dpChatList.update((chatList) => {
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

        if (!chatSelected) return;

        this.dpChatList.set([...this.chatList()]);

        this.dpIsStreaming.set(true);

        const authToken = await this.authService.listenUserAuthenticated()?.getIdToken() ?? '';

        this.socketService.sendMessages({
            history: chatSelected.history.slice(0, -1),
            aiEngine: this.aiEngine(),
            conversationId: chatSelected.id,
            authToken
        });
    }

    /**
     * @description Send user message to current chat history conversation
     *
     * @param parts user messages to send to AI
     */
    async conversationWs(parts: PartHistory[]): Promise<void> {
        return new Promise<void>(async (resolve) => {
            if (this.authService.listenUserAuthenticated() === null) {
                const textTranslation = this.translateService.instant(
                    'chat.chat-list.user-not-authenticated'
                );
                this.notifyService.error(textTranslation);
                return resolve();
            }

            let chatSelected: IChat | undefined;

            this.dpChatList.update((chatList) => {
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

            this.dpIsStreaming.set(true);

            const authToken = await this.authService.listenUserAuthenticated()?.getIdToken() ?? '';

            this.socketService.sendMessages({
                history: chatSelected.history.slice(0, -1),
                aiEngine: this.aiEngine(),
                conversationId: chatSelected.id,
                authToken
            });

            resolve();
        });
    }
}
