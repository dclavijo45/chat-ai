import {
    afterNextRender,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    Signal,
    signal,
    untracked,
    viewChild,
    WritableSignal,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators, } from '@angular/forms';
import { map } from 'rxjs';

import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MarkdownComponent } from 'ngx-markdown';
import { ThemeColorDirective } from '../../../../shared/directives/theme-color.directive';
import { NotifyService } from '../../../../shared/services/notify.service';
import { AiEngineEnum } from '../../enums/ai-engine.enum';
import { IChat } from '../../interfaces/chat.model';
import { IHRole, PartHistory, TypePartEnum, } from '../../interfaces/history.model';
import { IChatImage } from '../../interfaces/image.model';
import { ChatService } from '../../services/chat.service';
import { SocketService } from '../../services/socket.service';
import { AuthService } from "../../services/auth.service";
import { User } from "@angular/fire/auth";

@Component({
    selector: 'chat-history',
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ThemeColorDirective,
        TranslatePipe,
        MarkdownComponent,
    ],
    templateUrl: `./chat-history.component.html`,
    styleUrl: './chat-history.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatHistoryComponent {
    constructor() {
        this.userInputPrompt = new FormControl<string | null>('', [
            Validators.required,
        ]);

        this.chatHistory = signal({
            history: [],
            id: crypto.randomUUID(),
            aiEngine: AiEngineEnum.openai,
        });

        const userInputPromptValid = toSignal(
            this.userInputPrompt.statusChanges.pipe(
                map(() => this.userInputPrompt.valid)
            ),
            {initialValue: this.userInputPrompt.valid}
        );

        this.canSendChat = computed(
            () =>
                userInputPromptValid() &&
                this.isServerConnected() &&
                !this.isStreaming()
        );

        this.TypePartEnum = TypePartEnum;
        this.IHRole = IHRole;

        afterNextRender(() => {
            this.socketService.connect();
        });

        const {aiEngine, chatList, chatSelect} =
            this.chatService;

        effect(() => {
            if (
                [AiEngineEnum.deepseek, AiEngineEnum.perplexity].includes(
                    aiEngine()
                )
            ) {
                if (untracked(this.imagesList).length) {
                    const textTranslation = this.translateService.instant(
                        'chat.chat-history.current-model-not-support-img'
                    );

                    this.notifyService.error(textTranslation);

                    this.imagesList.set([]);
                }
            }
        });

        effect(() => {
            const chatHistory = chatList().find(
                (chat) => chat.id == untracked(chatSelect)
            );

            if (chatHistory) {
                this.chatHistory.set(chatHistory);
            }
        });

        effect(() => {
            if (!chatSelect()) {
                this.chatHistory.set({
                    history: [],
                    id: crypto.randomUUID(),
                    aiEngine: untracked(aiEngine),
                });
                return;
            }

            const chatHistory = untracked(chatList).find(
                (chat) => chat.id == chatSelect()
            );

            if (chatHistory) {
                this.chatHistory.set(chatHistory);
            }

            setTimeout(() => {
                this.scrollHistory(true);
            }, 100);
        });
    }

    /**
     * @description Service to manage chat history
     */
    private chatService: ChatService = inject(ChatService);

    /**
     * @description Change detector reference to update the view
     */
    private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

    /**
     * @description Service to notify messages to the user
     */
    private notifyService: NotifyService = inject(NotifyService);

    /**
     * @description Service to manage the socket connection
     */
    private socketService: SocketService = inject(SocketService);

    /**
     * @description Service to manage the translations
     */
    private translateService: TranslateService = inject(TranslateService);

    /**
     * @description Service to manage authentication
     */
    private authService = inject(AuthService);

    /**
     * @description Signal to get the authenticated user
     */
    get userAuthenticated(): Signal<User | null> {
        return this.authService.listenUserAuthenticated;
    }

    /**
     * @description html element reference to the chat history list
     */
    historyList: Signal<ElementRef<HTMLDivElement> | undefined> =
        viewChild<ElementRef<HTMLDivElement>>('historyList');

    /**
     * @description Chat history signal to manage the chat history
     */
    chatHistory: WritableSignal<IChat>;

    /**
     * @description Chat chunk stream signal to manage the chat chunk stream
     */
    chatChunkStream: Signal<string> = this.chatService.chatChunkStream

    /**
     * @description User input prompt form control
     */
    userInputPrompt: FormControl<string | null>;

    /**
     * @description List of images selected by user to send to the chat server
     */
    imagesList: WritableSignal<IChatImage[]> = signal<IChatImage[]>([]);

    /**
     * @description Enum to manage the type of part in the chat history
     */
    TypePartEnum: typeof TypePartEnum;

    /**
     * @description Enum to manage the role of the part in the chat history
     */
    IHRole: typeof IHRole;

    /**
     * @description Signal to check if the user can send a chat message
     */
    canSendChat: Signal<boolean>;

    /**
     * @description Flag if is streaming a chat server response
     */
    isStreaming: Signal<boolean> = this.chatService.isStreaming;

    /**
     * @description Flag if the server is connected
     */
    isServerConnected: Signal<boolean> = this.socketService.isConnected;

    /**
     * @description Send message to the chat server
     *
     * @param e Event to prevent default enter space
     */
    sendMessage(e: Event): void {
        e.preventDefault();

        if (!this.canSendChat()) return;

        if (this.authService.listenUserAuthenticated() === null) {
            const textTranslation = this.translateService.instant(
                'chat.chat-list.user-not-authenticated'
            );

            this.notifyService.error(textTranslation);
            return;
        }

        const userPrompt: string = JSON.parse(
            JSON.stringify(this.userInputPrompt.value)
        );

        if (!userPrompt.trim()) {
            return;
        }

        this.userInputPrompt.reset();

        const parts: PartHistory[] = [];

        if (this.imagesList().length) {
            for (const image of this.imagesList()) {
                const partImage: PartHistory = {
                    text: image.base64,
                    type: TypePartEnum.image,
                };

                parts.push(partImage);
            }
        }

        parts.push({
            type: TypePartEnum.text,
            text: userPrompt,
        });

        this.imagesList.set([]);

        if (this.chatHistory().history.length) {
            this.chatService.conversationWs(parts);
        } else {
            this.chatService.startChatWs(parts);
        }

        setTimeout(() => {
            this.scrollHistory(true);
        }, 100);
    }

    /**
     * @description Scroll to the bottom of the chat history list
     * @param inmediatly Flag to scroll inmediatly to the bottom
     */
    scrollHistory(inmediatly: boolean = false): void {
        const historyListElement = this.historyList()?.nativeElement;

        if (!historyListElement) return;

        const isAtBottom =
            historyListElement.scrollTop + historyListElement.clientHeight >=
            historyListElement.scrollHeight * 0.9;

        if (inmediatly || isAtBottom) {
            historyListElement.scrollTo({
                top: historyListElement.scrollHeight,
                behavior: 'smooth',
            });
        }
    }

    /**
     * @description Load images from the input file
     *
     * @param inputFile Input file to load images
     */
    loadImages(inputFile: HTMLInputElement): void {
        if (
            [AiEngineEnum.deepseek, AiEngineEnum.perplexity].includes(
                this.chatService.aiEngine()
            )
        ) {
            const textTranslation = this.translateService.instant(
                'chat.chat-history.current-model-not-support-img'
            );

            this.notifyService.error(textTranslation);
            return;
        }

        inputFile.click();
    }

    /**
     * @description Select files from the input file and add to the images list
     *
     * @param e Event to get the files from the input file
     * @returns
     */
    async selectFiles(e: any): Promise<void> {
        const files = e.target.files as File[];
        const maxFileSize = 1024 * 1024; // 1MB
        const maxFiles = 10;

        if (!files.length) return;

        if (files.length > maxFiles) {
            const textTranslation = this.translateService.instant(
                'chat.chat-history.support-max-files-number',
                {
                    maxFiles,
                }
            );

            this.notifyService.error(textTranslation);
            return;
        }

        const reader = new FileReader();

        for (const file of files) {
            if (file.size > maxFileSize) {
                const textTranslation = this.translateService.instant(
                    'chat.chat-history.image-size-exceeds-limit',
                    {
                        fileName: file.name,
                        maxFileSize: maxFileSize / 1024 / 1024,
                    }
                );

                this.notifyService.error(textTranslation);
                continue;
            }

            await new Promise<void>((resolve) => {
                reader.onload = (er) => {
                    if (
                        er?.target?.result &&
                        typeof er?.target?.result == 'string'
                    ) {
                        if (
                            !this.imagesList().find(
                                (img) => img.name == file.name
                            )
                        ) {
                            this.imagesList.update((imgList) => {
                                imgList.push({
                                    base64: er!.target!.result as string,
                                    name: file.name,
                                });
                                return imgList;
                            });
                        }
                    }

                    resolve();
                };

                reader.onerror = () => resolve();

                reader.readAsDataURL(file);
            });
        }

        e.target.value = '';

        this.cdr.detectChanges();
    }

    /**
     * @description Remove image from the images list
     *
     * @param image Image to remove from the images list
     */
    removeImage(image: IChatImage): void {
        this.imagesList.update((imgList) => {
            imgList = imgList.filter((img) => img.name != image.name);

            return imgList;
        });
    }
}
