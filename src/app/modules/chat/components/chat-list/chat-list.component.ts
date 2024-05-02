import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    Signal,
    inject,
} from '@angular/core';

import { ChatService } from '../../services/chat.service';
import { CommonModule } from '@angular/common';
import { IChat } from '../../interfaces/chat.model';
import { Observable } from 'rxjs';
import { ThemeColorEnum } from '../../../../shared/enums/theme-color.enum';
import { ThemeColorService } from '../../../../shared/services/theme-color.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
    selector: 'chat-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: `./chat-list.component.html`,
    styleUrl: './chat-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatListComponent implements OnInit {
    constructor() {
        this.chatService = inject(ChatService);
        this.themeColorService = inject(ThemeColorService);

        this.chatList = toSignal(this.chatService.chatList, {
            initialValue: [],
        });

        this.chatSelected = toSignal(this.chatService.chatSelect, {
            initialValue: '',
        });
    }

    private chatService: ChatService;

    themeColorService: ThemeColorService;

    chatList: Signal<IChat[]>;

    chatSelected: Signal<string>;

    get themeColor(): Observable<ThemeColorEnum> {
        return this.themeColorService.themeColor;
    }

    ngOnInit(): void {
        if (!this.chatList().length) {
            this.chatService.addChat();
        }
    }

    addChat(): void {
        if (this.chatList().length) {
            if (!this.chatList()[this.chatList().length - 1].history.length) {
                return;
            }
        }

        this.chatService.addChat();
    }

    selectChat(chatId: string): void {
        if (this.chatSelected() == chatId) return;

        this.chatService.selectChat(chatId);
    }

    toggleThemeColor(): void {
        this.themeColorService.toggleThemeColor();
    }
}
