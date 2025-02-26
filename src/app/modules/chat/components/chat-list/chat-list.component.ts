import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    Signal,
    inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { ThemeColorDirective } from '../../../../shared/directives/theme-color.directive';
import { ThemeColorEnum } from '../../../../shared/enums/theme-color.enum';
import { ThemeColorService } from '../../../../shared/services/theme-color.service';
import { AiEngineEnum } from '../../enums/ai-engine.enum';
import { IChat } from '../../interfaces/chat.model';
import { ChatService } from '../../services/chat.service';

@Component({
    selector: 'chat-list',
    imports: [CommonModule, ThemeColorDirective],
    templateUrl: `./chat-list.component.html`,
    styleUrl: './chat-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
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

        this.aiEngine = toSignal(this.chatService.aiEngine, {
            initialValue: AiEngineEnum.deepseek,
        });

        this.AiEngineEnum = AiEngineEnum;
    }

    /**
     * Service for managing chat data api
     */
    private chatService: ChatService;

    /**
     * Service for managing theme color design
     */
    themeColorService: ThemeColorService;

    /**
     * List of chat data
     */
    chatList: Signal<IChat[]>;

    /**
     * Selected chat id
     */
    chatSelected: Signal<string>;

    /**
     * Selected chat ai engine
     */
    aiEngine: Signal<AiEngineEnum>;

    /**
     * Enum for ai engine
     */
    AiEngineEnum: typeof AiEngineEnum;

    /**
     * Getter for theme color
     */
    get themeColor(): Observable<ThemeColorEnum> {
        return this.themeColorService.themeColor;
    }

    ngOnInit(): void {
        this.addChat();
    }

    /**
     * Add new chat to chat list
     */
    addChat(): void {
        this.chatService.addChat();
    }

    /**
     * Select chat by id
     *
     * @param chatId - chat id to select
     */
    selectChat(chatId: string): void {
        this.chatService.selectChat(chatId);
    }

    /**
     * Toggle theme color between available designs
     */
    toggleThemeColor(): void {
        this.themeColorService.toggleThemeColor();
    }

    /**
     * Set ai engine for selected chat
     *
     * @param engine - ai engine to set
     */
    setEngine(engine: AiEngineEnum): void {
        this.chatService.setAiEngine(engine);
    }
}
