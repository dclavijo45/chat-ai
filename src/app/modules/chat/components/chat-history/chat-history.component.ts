import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    Signal,
    ViewChild,
    WritableSignal,
    inject,
    signal,
} from '@angular/core';
import {
    FormControl,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';

import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ThemeColorDirective } from '../../../../shared/directives/theme-color.directive';
import { IChat } from '../../interfaces/chat.model';
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

        this.chatHistory = signal({
            history: [],
            id: crypto.randomUUID(),
        });

        this.chatChunkStream = toSignal(this.chatService.chatChunkStream, {
            initialValue: '',
        });

        this.$destroy = new Subscription();

        this.isStreaming = false;
    }

    @ViewChild('historyList') historyList!: ElementRef<HTMLDivElement>;

    private chatService: ChatService;

    private $destroy: Subscription;

    private isStreaming: boolean;

    chatHistory: WritableSignal<IChat>;

    chatChunkStream: Signal<string>;

    userInputPrompt: FormControl<string | null>;

    ngOnInit(): void {
        this.$destroy.add(
            this.chatService.chatSelect.subscribe(async (chatId) => {
                let $ = null;

                const chatList = await new Promise<IChat[]>((resolve) => {
                    $ = this.chatService.chatList.subscribe((chatL) =>
                        resolve(chatL)
                    );
                });

                $!.unsubscribe();

                const chatHistory = chatList.find((chat) => chat.id == chatId);

                if (chatHistory) {
                    this.chatHistory.set(chatHistory);
                }

                this.scrollHistory();
            })
        );

        this.$destroy.add(
            this.chatService.chatList.subscribe(async (chatList) => {
                let $ = null;

                const chatSelected = await new Promise<string>((resolve) => {
                    $ = this.chatService.chatSelect.subscribe((chatS) =>
                        resolve(chatS)
                    );
                });

                $!.unsubscribe();

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

        const userPrompt = JSON.parse(
            JSON.stringify(this.userInputPrompt.value)
        );

        this.userInputPrompt.reset();

        if (this.chatHistory().history.length) {
            await this.chatService.conversation(userPrompt.trim());
        } else {
            await this.chatService.startChat(userPrompt.trim());
        }

        this.isStreaming = false;
    }

    scrollHistory(): void {
        setTimeout(() => {
            this.historyList.nativeElement.scrollTop =
                this.historyList.nativeElement.scrollHeight;
        }, 100);
    }
}
