import {
    afterNextRender,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    inject,
    OnDestroy,
    OnInit,
    Signal,
    signal,
    ViewChild,
    WritableSignal,
} from '@angular/core';
import {
    FormControl,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { firstValueFrom, Subscription } from 'rxjs';

import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MarkdownModule } from 'ngx-markdown';
import { ThemeColorDirective } from '../../../../shared/directives/theme-color.directive';
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
export class ChatHistoryComponent implements OnInit, OnDestroy {
    constructor() {
        this.chatService = inject(ChatService);
        this.cdr = inject(ChangeDetectorRef);
        this.notifyService = inject(NotifyService);
        this.socketService = inject(SocketService);
        this.translateService = inject(TranslateService);

        this.userInputPrompt = new FormControl<string | null>('', [
            Validators.required,
        ]);

        this.chatHistory = signal({
            history: [],
            id: crypto.randomUUID(),
            aiEngine: AiEngineEnum.deepseek,
        });

        this.chatChunkStream = toSignal(this.chatService.chatChunkStream, {
            initialValue: '',
        });

        this.aiEngine = toSignal(this.chatService.aiEngine, {
            initialValue: AiEngineEnum.deepseek,
        });

        this.isServerConnected = toSignal(
            this.socketService.listenIsConnected,
            {
                initialValue: false,
            }
        );

        this.$destroy = new Subscription();

        this.isStreaming = toSignal(this.chatService.isStreaming, {
            initialValue: false,
        });

        this.imagesList = signal([]);

        this.TypePartEnum = TypePartEnum;
        this.IHRole = IHRole;

        afterNextRender(() => {
            this.socketService.connect();
        });
    }

    /**
     * @description Html element reference to the chat history list
     */
    @ViewChild('historyList') historyList!: ElementRef<HTMLDivElement>;

    /**
     * @description Service to manage chat history
     */
    private chatService: ChatService;

    /**
     * @description Subscription to destroy observables
     */
    private $destroy: Subscription;

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
     * @description Flag if is streaming a chat server response
     */
    isStreaming: Signal<boolean>;

    /**
     * @description Flag if the server is connected
     */
    isServerConnected: Signal<boolean>;

    /**
     * @description Chat history signal to manage the chat history
     */
    chatHistory: WritableSignal<IChat>;

    /**
     * @description Chat chunk stream signal to manage the chat chunk stream
     */
    chatChunkStream: Signal<string>;

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
     * @description Selected chat ai engine
     */
    aiEngine: Signal<AiEngineEnum>;

    ngOnInit(): void {
        this.$destroy.add(
            this.chatService.chatSelect.subscribe(async (chatId) => {
                const chatList = await firstValueFrom(
                    this.chatService.chatList
                );
                const chatHistory = chatList.find((chat) => chat.id == chatId);

                if (chatHistory) {
                    this.chatHistory.set(chatHistory);
                }

                this.scrollHistory();
            })
        );

        this.$destroy.add(
            this.chatService.chatList.subscribe(async (chatList) => {
                const chatSelected = await firstValueFrom(
                    this.chatService.chatSelect
                );
                const chatHistory = chatList.find(
                    (chat) => chat.id == chatSelected
                );

                if (chatHistory) {
                    this.chatHistory.set(chatHistory);
                }

                this.scrollHistory();
            })
        );

        this.$destroy.add(
            this.chatService.aiEngine.subscribe(async (aiEngine) => {
                if (
                    [
                        AiEngineEnum.deepseek,
                        AiEngineEnum.qwenai,
                        AiEngineEnum.mistral,
                    ].includes(aiEngine)
                ) {
                    if (this.imagesList().length) {
                        const textTranslation = this.translateService.instant(
                            'chat.chat-history.current-model-not-support-img'
                        );

                        this.notifyService.error(textTranslation);

                        this.imagesList.set([]);
                    }
                }
            })
        );

        this.$destroy.add(
            this.chatService.chatChunkStream.subscribe(() => {
                this.scrollHistory();
            })
        );
    }

    ngOnDestroy(): void {
        this.$destroy ? this.$destroy.unsubscribe() : false;
    }

    /**
     * @description Send message to the chat server
     *
     * @param e Event to prevent default enter space
     */
    async sendMessage(e: Event): Promise<void> {
        e.preventDefault();

        if (!this.isServerConnected()) return;

        if (this.isStreaming()) return;

        if (this.userInputPrompt.invalid) return;

        if (!this.userInputPrompt.value?.trim()) return;

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
            await this.chatService.conversationWs(parts);
        } else {
            await this.chatService.startChatWs(parts);
        }
    }

    /**
     * @description Scroll to the bottom of the chat history list
     */
    scrollHistory(): void {
        setTimeout(() => {
            this.historyList.nativeElement.scrollTop =
                this.historyList.nativeElement.scrollHeight;
        }, 100);
    }

    /**
     * @description Load images from the input file
     *
     * @param inputFile Input file to load images
     */
    loadImages(inputFile: HTMLInputElement): void {
        if (
            [
                AiEngineEnum.deepseek,
                AiEngineEnum.qwenai,
                AiEngineEnum.mistral,
            ].includes(this.aiEngine())
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
