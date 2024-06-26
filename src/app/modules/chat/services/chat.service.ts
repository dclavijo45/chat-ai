import { IHRole, IHistory, PartHistory, TypePartEnum } from '../interfaces/history.model';
import { Injectable, WritableSignal, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { IChat } from '../interfaces/chat.model';
import { environment } from '../../../../environments/environtment';
import { toObservable } from '@angular/core/rxjs-interop';
import { AiEngineEnum } from '../enums/ai-engine.enum';

@Injectable({
    providedIn: 'root',
})
export class ChatService {
    constructor() {
        this.dispathChatChunk = new Subject<string>();
        this.chatChunkStream = this.dispathChatChunk.asObservable();

        this.dispathChatList = signal<IChat[]>([]);
        this.chatList = toObservable(this.dispathChatList);

        this.dispathChatSelect = signal('');
        this.chatSelect = toObservable(this.dispathChatSelect);

        this.dispatchAiEngine = signal(AiEngineEnum.openai);
        this.aiEngine = toObservable(this.dispatchAiEngine);
    }

    private dispathChatChunk: Subject<string>;
    private dispathChatList: WritableSignal<IChat[]>;
    private dispathChatSelect: WritableSignal<string>;
    private dispatchAiEngine: WritableSignal<AiEngineEnum>;

    chatChunkStream: Observable<string>;
    chatList: Observable<IChat[]>;
    chatSelect: Observable<string>;
    aiEngine: Observable<AiEngineEnum>;

    /**
     * Select a chat by chat id
     *
     * @param chatId chat id to chat to select
     */
    selectChat(chatId: string): void {
        this.dispathChatSelect.set(chatId);
    }

    /**
     * Select a ai engine
     *
     * @param engine AI engine enum selected
     */
    setAiEngine(engine: AiEngineEnum): void {
        this.dispatchAiEngine.set(engine);
    }

    /**
     * Add a chat to chat list and select it
     */
    addChat(): void {
        const chatId = crypto.randomUUID();

        this.dispathChatList.update((value) => {
            value.push({
                history: [],
                id: chatId,
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

                            return resolve();
                        }

                        const content = decoder.decode(value, { stream: true });

                        text += content;

                        this.dispathChatChunk.next(text);

                        readChunk();
                    };

                    readChunk();
                } else {
                    resolve();
                }
            } catch (error) {
                this.dispathChatChunk.next('Ha ocurrido un error');
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

                            return resolve();
                        }

                        const content = decoder.decode(value, { stream: true });

                        text += content;

                        this.dispathChatChunk.next(text);

                        readChunk();
                    };

                    readChunk();
                } else {
                    resolve();
                }
            } catch (error) {
                this.dispathChatChunk.next('Ha ocurrido un error');
                resolve();
            }
        });
    }
}
