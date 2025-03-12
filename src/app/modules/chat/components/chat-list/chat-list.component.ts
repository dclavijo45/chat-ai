import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    WritableSignal,
    inject,
    signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ContextMenuModule } from '@perfectmemory/ngx-contextmenu';
import { connect } from 'ngxtension/connect';
import { i18nConstant } from '../../../../shared/constants/i18n.constant';
import { ThemeColorDirective } from '../../../../shared/directives/theme-color.directive';
import { ThemeColorEnum } from '../../../../shared/enums/theme-color.enum';
import { I18nLanguage } from '../../../../shared/interfaces/i18n.model';
import { ThemeColorService } from '../../../../shared/services/theme-color.service';
import { AiEngineEnum } from '../../enums/ai-engine.enum';
import { IChat } from '../../interfaces/chat.model';
import { ChatService } from '../../services/chat.service';

@Component({
    selector: 'chat-list',
    imports: [
        CommonModule,
        ThemeColorDirective,
        ContextMenuModule,
        TranslateModule,
    ],
    templateUrl: `./chat-list.component.html`,
    styleUrl: './chat-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatListComponent implements OnInit {
    constructor() {
        this.chatService = inject(ChatService);
        this.themeColorService = inject(ThemeColorService);
        this.translateService = inject(TranslateService);

        this.chatList = signal<IChat[]>([]);
        this.aiEngine = signal(AiEngineEnum.deepseek);
        this.chatSelected = signal<string>('');

        connect(this.chatList, () => this.chatService.chatList());
        connect(this.chatSelected, () => this.chatService.chatSelect());
        connect(this.aiEngine, () => this.chatService.aiEngine());

        this.AiEngineEnum = AiEngineEnum;
        this.aiEngineList = Object.values(AiEngineEnum);
    }

    /**
     * @description Service for managing chat data api
     */
    private chatService: ChatService;

    /**
     * @description Translate service for the app
     */
    private translateService: TranslateService;

    /**
     * @description Service for managing theme color design
     */
    themeColorService: ThemeColorService;

    /**
     * @description List of chat data
     */
    chatList: WritableSignal<IChat[]>;

    /**
     * @description Selected chat id
     */
    chatSelected: WritableSignal<string>;

    /**
     * @description Selected chat ai engine
     */
    aiEngine: WritableSignal<AiEngineEnum>;

    /**
     * @description Enum for ai engine
     */
    AiEngineEnum: typeof AiEngineEnum;

    /**
     * @description List of available ai engines
     */
    aiEngineList: AiEngineEnum[];

    /**
     * @description Getter for theme color
     */
    get themeColor(): WritableSignal<ThemeColorEnum> {
        return this.themeColorService.themeColor;
    }

    /**
     * @description Languages list
     */
    get languages(): I18nLanguage[] {
        return i18nConstant.LANGUAGES;
    }

    /**
     * @description Current language
     */
    get currentLanguage(): string {
        return this.translateService.currentLang;
    }

    ngOnInit(): void {
        this.addChat();
    }

    /**
     * @description Change language
     *
     * @param language Language to set
     */
    changeLanguage(language: I18nLanguage): void {
        this.translateService.use(language.code);
    }

    /**
     * @description Add new chat to chat list
     */
    addChat(): void {
        this.chatService.addChat();
    }

    /**
     * @description Select chat by id
     *
     * @param chatId - chat id to select
     */
    selectChat(chatId: string): void {
        this.chatService.selectChat(chatId);
    }

    /**
     * @description Toggle theme color between available designs
     */
    toggleThemeColor(): void {
        this.themeColorService.toggleThemeColor();
    }

    /**
     * @description Set ai engine for selected chat
     *
     * @param engine - ai engine to set
     */
    setEngine(engine: AiEngineEnum): void {
        this.chatService.setAiEngine(engine);
    }
}
