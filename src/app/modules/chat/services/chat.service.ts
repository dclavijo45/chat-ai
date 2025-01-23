import { IHRole, IHistory, PartHistory, TypePartEnum } from '../interfaces/history.model';
import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { IChat } from '../interfaces/chat.model';
import { environment } from '../../../../environments/environtment';
import { toObservable } from '@angular/core/rxjs-interop';
import { AiEngineEnum } from '../enums/ai-engine.enum';
import { NotifyService } from '../../../shared/services/notify.service';

@Injectable({
    providedIn: 'root',
})
export class ChatService {
    constructor() {
        this.notifyService = inject(NotifyService);

        this.dispathChatChunk = new Subject<string>();
        this.chatChunkStream = this.dispathChatChunk.asObservable();

        this.dispathChatList = signal<IChat[]>([]);
        this.chatList = toObservable(this.dispathChatList);

        this.dispathChatSelect = signal('');
        this.chatSelect = toObservable(this.dispathChatSelect);

        this.dispatchAiEngine = signal(AiEngineEnum.deepseek);
        this.aiEngine = toObservable(this.dispatchAiEngine);

        this.isStreaming = signal(false);
    }

    /**
     * Notify service for show messages to user
     */
    private notifyService: NotifyService;

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
     * Signal to dispatch if is streaming a chat server response
     */
    isStreaming: WritableSignal<boolean>;

    /**
     * Select a chat by chat id
     *
     * @param chatId chat id to chat to select
     */
    selectChat(chatId: string): void {
        if (this.isStreaming()) {
            this.notifyService.warning('No puedes cambiar de chat mientras está en espera de respuesta');
            return;
        }

        if (this.dispathChatSelect() == chatId) return;

        const chatList = this.dispathChatList.asReadonly()();

        const chatSelected = chatList.find(
            (chat) => chat.id == chatId
        );

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
        if (this.isStreaming()) {
            this.notifyService.warning('No puedes cambiar de modelo mientras está en espera de respuesta');
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
        if (this.isStreaming()) {
            this.notifyService.warning('No puedes agregar un chat mientras está en espera de respuesta');
            return;
        }

        if (this.dispathChatList().length) {
            if (!this.dispathChatList()[this.dispathChatList().length - 1].history.length) {
                this.notifyService.error('No puedes agregar un chat hasta que el chat actual haya comenzado');
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
    async startChat(parts: PartHistory[]): Promise<void> {
        return new Promise<void>(async (resolve) => {
            const chatList: IChat[] = JSON.parse(
                JSON.stringify(this.dispathChatList.asReadonly()())
            );

            const chatSelected = chatList.find(
                (chatE) => chatE.id == this.dispathChatSelect()
            );

            if (!chatSelected) return resolve();

            this.isStreaming.set(true);

            chatSelected.history.push({
                role: IHRole.user,
                parts
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

            try {
                const response = await fetch(
                    `${environment.backend_url}/${this.dispatchAiEngine()}/chat/start`,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            history: chatSelected.history[0],
                        }),
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (response?.body) {
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let text = '';

                    const readChunk = async () => {
                        const { done, value } = await reader.read();

                        if (done) {
                            chatSelected.history[
                                chatSelected.history.length - 1
                            ].parts[0].text = text;

                            this.dispathChatList.set(chatList);

                            this.dispathChatChunk.next('');

                            this.isStreaming.set(false);
                            return resolve();
                        }

                        const content = decoder.decode(value, { stream: true });

                        text += content;

                        this.dispathChatChunk.next(text);

                        readChunk();
                    };

                    readChunk();
                } else {
                    this.isStreaming.set(false);
                    resolve();
                }
            } catch (error) {
                this.dispathChatChunk.next('Ha ocurrido un error');
                this.isStreaming.set(false);
                resolve();
            }
        });
    }

    /**
     * Send user message to current chat history conversation
     *
     * @param parts user messages to send to AI
     */
    async conversation(parts: PartHistory[]): Promise<void> {
        return new Promise<void>(async (resolve) => {
            const chatList: IChat[] = JSON.parse(
                JSON.stringify(this.dispathChatList.asReadonly()())
            );

            let chatHistoryM: IHistory[] = [];

            const chatHistory = chatList.find(
                (chatL) => chatL.id == this.dispathChatSelect()
            );

            if (!chatHistory) return resolve();

            this.isStreaming.set(true);

            chatHistory.history.push({
                role: IHRole.user,
                parts
            });

            chatHistoryM = JSON.parse(JSON.stringify(chatHistory.history));

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

            try {
                const response = await fetch(
                    `${environment.backend_url}/${this.dispatchAiEngine()}/chat/conversation`,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            history: chatHistoryM,
                        }),
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (response?.body) {
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let text = '';

                    const readChunk = async () => {
                        const { done, value } = await reader.read();

                        if (done) {
                            const chatSelected = chatList.find(
                                (chatE) => chatE.id == this.dispathChatSelect()
                            );

                            if (chatSelected) {
                                chatSelected.history[
                                    chatSelected.history.length - 1
                                ].parts[0].text = text;
                            }

                            this.dispathChatList.set(chatList);

                            this.dispathChatChunk.next('');

                            this.isStreaming.set(false);
                            return resolve();
                        }

                        const content = decoder.decode(value, { stream: true });

                        text += content;

                        this.dispathChatChunk.next(text);

                        readChunk();
                    };

                    readChunk();
                } else {
                    this.isStreaming.set(false);
                    resolve();
                }
            } catch (error) {
                this.dispathChatChunk.next('Ha ocurrido un error');
                this.isStreaming.set(false);
                resolve();
            }
        });
    }
}
