import {
    afterNextRender,
    inject,
    Injectable,
    signal,
    WritableSignal
} from '@angular/core';
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

        this.chatChunkStream = signal('');
        this.chatList = signal<IChat[]>([]);
        this.chatSelect = signal('');
        this.aiEngine = signal(AiEngineEnum.grok);
        this.isStreaming = signal(false);
        this.allowStoreChats = signal(false);

        this.listenMessage();

        afterNextRender(() => {
            this.loadStoredChats();
            this.getPermissionStoreChats();
        });
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
     * @description Signal to get chat chunk
     */
    public chatChunkStream: WritableSignal<string>;

    /**
     * @description Signal to get permission to store chats from local storage
     */
    public allowStoreChats: WritableSignal<boolean>;

    /**
     * @description Listen message from socket service
     */
    private listenMessage(): void {
        this.socketService.listenMessage.subscribe((message) => {
            this.chatChunkStream.update(
                (chunk) => chunk + message.messageChunk
            );

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
                ].parts[0].text = JSON.parse(
                    JSON.stringify(this.chatChunkStream())
                );

                this.chatChunkStream.set('');
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

        this.allowStoreChats.set(allowStoreChats == '1');
    }

    /**
     * @description Load stored chats from local storage
     *  (Called from component for change detection)
     */
    loadStoredChats(): void {
        const chatList = localStorage.getItem('chatList');

        if (chatList) {
            this.chatList.set(JSON.parse(chatList));
        }
    }

    /**
     * @description Clean chat list and chat select from memory and local storage
     */
    cleanChatList(): void {
        if (!this.chatList().length || this.isStreaming()) return;

        this.chatList.set([]);
        this.chatSelect.set('');

        localStorage.removeItem('chatList');
    }

    /**
     * @description Toggle permission to store chats
     */
    toggleStoreChatsPermission(): void {
        const allowStoreChats = this.allowStoreChats();

        localStorage.setItem('allowStoreChats', Number(!allowStoreChats).toString());

        this.allowStoreChats.set(!allowStoreChats);
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

        this.chatList.update((value) => {
            const index = value.findIndex((chatE) => chatE.id == chat.id);

            if (index == -1) return value;

            value.splice(index, 1);

            return value;
        });

        if (this.chatSelect() == chat.id) {
            this.chatSelect.set('');
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
    setAiEngine(engine: AiEngineEnum): void {
        if (this.isStreaming()) {
            const textTranslation = this.translateService.instant(
                'chat.chat-list.cant-change-model-while-streaming'
            );
            this.notifyService.warning(textTranslation);
            return;
        }

        if (!this.chatSelect()) {
            this.aiEngine.set(engine);
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
    startChatWs(parts: PartHistory[]): void {
        let chatSelected: IChat | undefined;

        if (!this.chatSelect()) {
            this.addChat();
        }

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

        if (!chatSelected) return;

        this.chatList.set([...this.chatList()]);

        this.isStreaming.set(true);

        this.socketService.sendMessages({
            history: chatSelected.history.slice(0, -1),
            aiEngine: this.aiEngine(),
            conversationId: chatSelected.id,
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

            this.socketService.sendMessages({
                history: chatSelected.history.slice(0, -1),
                aiEngine: this.aiEngine(),
                conversationId: chatSelected.id,
            });

            resolve();
        });
    }
}
