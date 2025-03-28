import {
    afterNextRender,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    computed,
    ElementRef,
    inject,
    Signal,
    signal,
    viewChild,
    WritableSignal
} from '@angular/core';
import {
    FormControl,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { map } from 'rxjs';

import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MarkdownModule } from 'ngx-markdown';
import { connect } from 'ngxtension/connect';
import { explicitEffect } from 'ngxtension/explicit-effect';
import { ThemeColorDirective } from '../../../../shared/directives/theme-color.directive';
import { TrimValidator } from '../../../../shared/form-validators/trim.validator';
import { NotifyService } from '../../../../shared/services/notify.service';
import { AiEngineEnum } from '../../enums/ai-engine.enum';
import { IChat } from '../../interfaces/chat.model';
import {
    IHRole,
    PartHistory,
    TypePartEnum,
} from '../../interfaces/history.model';
import { IChatImage } from '../../interfaces/image.model';
import { ToggleChunkChatPipe } from '../../pipes/toggleChunkChat.pipe';
import { ChatService } from '../../services/chat.service';
import { SocketService } from '../../services/socket.service';

@Component({
    selector: 'chat-history',
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ToggleChunkChatPipe,
        ThemeColorDirective,
        MarkdownModule,
        TranslateModule,
    ],
    templateUrl: `./chat-history.component.html`,
    styleUrl: './chat-history.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatHistoryComponent {
    constructor() {
        this.chatService = inject(ChatService);
        this.cdr = inject(ChangeDetectorRef);
        this.notifyService = inject(NotifyService);
        this.socketService = inject(SocketService);
        this.translateService = inject(TranslateService);

        this.userInputPrompt = new FormControl<string | null>('', [
            Validators.required,
            TrimValidator(),
        ]);

        this.chatHistory = signal({
            history: [],
            id: crypto.randomUUID(),
            aiEngine: AiEngineEnum.deepseek,
        });
        this.isServerConnected = signal(false);
        this.isStreaming = signal(false);
        this.imagesList = signal([]);
        this.chatChunkStream = signal('');

        const userInputPromptValid = toSignal(
            this.userInputPrompt.statusChanges.pipe(
                map(() => this.userInputPrompt.valid)
            ),
            { initialValue: this.userInputPrompt.valid }
        );

        this.canSendChat = computed(
            () =>
                userInputPromptValid() &&
                this.isServerConnected() &&
                !this.isStreaming()
        );

        this.TypePartEnum = TypePartEnum;
        this.IHRole = IHRole;

        connect(this.isStreaming, () => this.chatService.isStreaming());
        connect(this.isServerConnected, () => this.socketService.isConnected());
        connect(this.chatChunkStream, () => this.chatService.chatChunkStream());

        afterNextRender(() => {
            this.socketService.connect();
        });

        this.listenSignals();
    }

    /**
     * @description Service to manage chat history
     */
    private chatService: ChatService;

    /**
     * @description Change detector reference to update the view
     */
    private cdr: ChangeDetectorRef;

    /**
     * @description Service to notify messages to the user
     */
    private notifyService: NotifyService;

    /**
     * @description Service to manage the socket connection
     */
    private socketService: SocketService;

    /**
     * @description Service to manage the translations
     */
    private translateService: TranslateService;

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
    chatChunkStream: WritableSignal<string>;

    /**
     * @description User input prompt form control
     */
    userInputPrompt: FormControl<string | null>;

    /**
     * @description List of images selected by user to send to the chat server
     */
    imagesList: WritableSignal<IChatImage[]>;

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
    isStreaming: WritableSignal<boolean>;

    /**
     * @description Flag if the server is connected
     */
    isServerConnected: WritableSignal<boolean>;

    /**
     * @description Listen signals for manage actions
     */
    private listenSignals(): void {
        explicitEffect(
            [this.chatService.aiEngine],
            ([aiEngine]) => {
                if (
                    [AiEngineEnum.deepseek, AiEngineEnum.perplexity].includes(
                        aiEngine
                    )
                ) {
                    if (this.imagesList().length) {
                        const textTranslation = this.translateService.instant(
                            'chat.chat-history.current-model-not-support-img'
                        );

                        this.notifyService.error(textTranslation);

                        this.imagesList.set([]);
                    }
                }
            },
            { defer: true }
        );

        explicitEffect(
            [this.chatService.chatList],
            ([chatList]) => {
                const chatSelected = this.chatService.chatSelect();
                const chatHistory = chatList.find(
                    (chat) => chat.id == chatSelected
                );

                if (chatHistory) {
                    this.chatHistory.set(chatHistory);
                }
            },
            { defer: true }
        );

        explicitEffect(
            [this.chatService.chatSelect],
            ([chatSelect]) => {
                if (!chatSelect) {
                    this.chatHistory.set({
                        history: [],
                        id: crypto.randomUUID(),
                        aiEngine: this.chatService.aiEngine(),
                    });
                    return;
                }

                const chatList = this.chatService.chatList();
                const chatHistory = chatList.find(
                    (chat) => chat.id == chatSelect
                );

                if (chatHistory) {
                    this.chatHistory.set(chatHistory);
                }

                setTimeout(() => {
                    this.scrollHistory(true);
                }, 100);
            },
            { defer: true }
        );

        explicitEffect(
            [this.chatService.chatChunkStream],
            ([chunk]) => {
                this.scrollHistory();
            },
            { defer: true }
        );
    }

    /**
     * @description Send message to the chat server
     *
     * @param e Event to prevent default enter space
     */
    sendMessage(e: Event): void {
        e.preventDefault();

        if (!this.canSendChat()) return;

        const userPrompt: string = JSON.parse(
            JSON.stringify(this.userInputPrompt.value)
        );

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
        const maxFileSize = 1 * 1024 * 1024; // 1MB
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
