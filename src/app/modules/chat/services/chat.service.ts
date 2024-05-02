import { IHRole, IHistory } from '../interfaces/history.model';
import { Injectable, WritableSignal, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { IChat } from '../interfaces/chat.model';
import { environment } from '../../../../environments/environtment';
import { toObservable } from '@angular/core/rxjs-interop';

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
    }

    private dispathChatChunk: Subject<string>;
    private dispathChatList: WritableSignal<IChat[]>;
    private dispathChatSelect: WritableSignal<string>;

    chatChunkStream: Observable<string>;
    chatList: Observable<IChat[]>;
    chatSelect: Observable<string>;

    /**
     * Select a chat by chat id
     *
     * @param chatId chat id to chat to select
     */
    selectChat(chatId: string): void {
        this.dispathChatSelect.set(chatId);
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
     * @param userPrompt user message to send to AI
     */
    async startChat(userPrompt: string): Promise<void> {
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
                parts: [
                    {
                        text: userPrompt,
                    },
                ],
            });

            chatSelected.history.push({
                role: IHRole.model,
                parts: [
                    {
                        text: '',
                    },
                ],
            });

            this.dispathChatList.set(chatList);

            try {
                const response = await fetch(
                    `${environment.backend_url}/chat/start`,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            prompt: userPrompt,
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
     * @param userPrompt user message to send to AI
     */
    async conversation(userPrompt: string): Promise<void> {
        return new Promise<void>(async (resolve) => {
            const chatList: IChat[] = JSON.parse(
                JSON.stringify(this.dispathChatList.asReadonly()())
            );

            let chatHistoryM: IHistory[] = [];

            const chatHistory = chatList.find(
                (chatL) => chatL.id == this.dispathChatSelect()
            );

            if (!chatHistory) return resolve();

            chatHistoryM = JSON.parse(JSON.stringify(chatHistory.history));

            chatHistory.history.push({
                role: IHRole.user,
                parts: [
                    {
                        text: userPrompt,
                    },
                ],
            });

            chatHistory.history.push({
                role: IHRole.model,
                parts: [
                    {
                        text: '',
                    },
                ],
            });

            this.dispathChatList.set(chatList);

            try {
                const response = await fetch(
                    `${environment.backend_url}/chat/conversation`,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            prompt: userPrompt,
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
