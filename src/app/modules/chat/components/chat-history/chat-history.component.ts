import {
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

@Component({
    selector: 'chat-history',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ToggleChunkChatPipe,
        ThemeColorDirective,
        MarkdownModule
    ],
    templateUrl: `./chat-history.component.html`,
    styleUrl: './chat-history.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatHistoryComponent implements OnInit, OnDestroy {
    constructor() {
        this.userInputPrompt = new FormControl<string | null>('', [
            Validators.required,
        ]);

        this.chatService = inject(ChatService);
        this.cdr = inject(ChangeDetectorRef);
        this.notifyService = inject(NotifyService);

        this.chatHistory = signal({
            history: [],
            id: crypto.randomUUID(),
            aiEngine: AiEngineEnum.deepseek,
        });

        this.chatChunkStream = toSignal(this.chatService.chatChunkStream, {
            initialValue: '',
        });

        this.$destroy = new Subscription();

        this.isStreaming = false;

        this.imagesList = signal([]);

        this.TypePartEnum = TypePartEnum;
        this.IHRole = IHRole;
    }

    @ViewChild('historyList') historyList!: ElementRef<HTMLDivElement>;

    private chatService: ChatService;

    private $destroy: Subscription;

    private isStreaming: boolean;

    private cdr: ChangeDetectorRef;

    private notifyService: NotifyService;

    chatHistory: WritableSignal<IChat>;

    chatChunkStream: Signal<string>;

    userInputPrompt: FormControl<string | null>;

    imagesList: WritableSignal<IChatImage[]>;

    TypePartEnum: typeof TypePartEnum;

    IHRole: typeof IHRole;

    ngOnInit(): void {
        this.$destroy.add(
            this.chatService.chatSelect.subscribe(async (chatId) => {
                const chatList = await firstValueFrom(this.chatService.chatList);
                const chatHistory = chatList.find((chat) => chat.id == chatId);

                if (chatHistory) {
                    this.chatHistory.set(chatHistory);
                }

                this.scrollHistory();
            })
        );

        this.$destroy.add(
            this.chatService.chatList.subscribe(async (chatList) => {
                const chatSelected = await firstValueFrom(this.chatService.chatSelect);
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
            this.chatService.chatChunkStream.subscribe(() => {
                this.scrollHistory();
            })
        );
    }

    ngOnDestroy(): void {
        this.$destroy ? this.$destroy.unsubscribe() : false;
    }

    async sendMessage(e: Event): Promise<void> {
        e.preventDefault();

        if (this.isStreaming) return;

        if (this.userInputPrompt.invalid) return;

        if (!this.userInputPrompt.value?.trim()) return;

        this.isStreaming = true;

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
            await this.chatService.conversation(parts);
        } else {
            await this.chatService.startChat(parts);
        }

        this.isStreaming = false;
    }

    scrollHistory(): void {
        setTimeout(() => {
            this.historyList.nativeElement.scrollTop =
                this.historyList.nativeElement.scrollHeight;
        }, 100);
    }

    async selectFiles(e: any): Promise<void> {
        const files = e.target.files as File[];
        const maxFileSize = 1 * 1024 * 1024; // 1MB
        const maxFiles = 10;

        if (!files.length) return;

        if (files.length > maxFiles) {
            this.notifyService.error(`Solo se permiten máximo ${maxFiles} imágenes`);
            return;
        }

        const reader = new FileReader();

        for (const file of files) {
            if (file.size > maxFileSize) {
                this.notifyService.error(
                    `La imagen ${file.name} supera el tamaño máximo (${
                        maxFileSize / 1024 / 1024
                    }MB)`
                );
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

    removeImage(image: IChatImage): void {
        this.imagesList.update((imgList) => {
            imgList = imgList.filter((img) => img.name != image.name);

            return imgList;
        });
    }
}
