import {
    ChangeDetectionStrategy,
    Component,
    WritableSignal,
    afterNextRender,
    inject,
    signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { TippyDirective } from '@ngneat/helipopper';
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
import { NotifyService } from '../../../../shared/services/notify.service';

@Component({
    selector: 'chat-list',
    imports: [
        CommonModule,
        ThemeColorDirective,
        ContextMenuModule,
        TranslateModule,
        TippyDirective,
    ],
    templateUrl: `./chat-list.component.html`,
    styleUrl: './chat-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatListComponent {
    constructor() {
        this.chatService = inject(ChatService);
        this.themeColorService = inject(ThemeColorService);
        this.translateService = inject(TranslateService);
        this.notifyService = inject(NotifyService);

        this.chatList = signal<IChat[]>([]);
        this.aiEngine = signal(AiEngineEnum.deepseek);
        this.chatSelected = signal<string>('');

        connect(this.chatList, () => this.chatService.chatList());
        connect(this.chatSelected, () => this.chatService.chatSelect());
        connect(this.aiEngine, () => this.chatService.aiEngine());

        this.AiEngineEnum = AiEngineEnum;
        this.aiEngineList = Object.values(AiEngineEnum);

        afterNextRender(() => {
            this.chatService.loadStoredChats();
        });
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
     * @description Service for managing notifications
     */
    private notifyService: NotifyService;

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

    /**
     * @description Flag if the chat list can be cleaned
     */
    get canCleanChatList(): boolean {
        return !this.chatList().length || this.chatService.isStreaming();
    }

    /**
     * @description Flag if can store chats
     */
    get allowStoreChats(): boolean {
        return this.chatService.allowStoreChats();
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
     * @description Remove chat from chat list
     * @param e event parent element for prevent click
     * @param chat chat to remove
     */
    removeChat(e: Event, chat: IChat): void {
        e.stopPropagation();

        this.chatService.removeChat(chat);
    }

    /**
     * @description Add new chat to chat list
     */
    addChat(): void {
        if (!this.chatList().length || !this.chatSelected()) {
            const textTranslation = this.translateService.instant(
                'chat.chat-list.cant-add-conversation-before-start-chat'
            );
            this.notifyService.error(textTranslation);
            return;
        }

        this.chatService.addChat();
    }

    /**
     * @description Clean chat list
     */
    cleanChatList(): void {
        this.chatService.cleanChatList();
    }

    /**
     * @description Toggle store chats permission
     */
    toggleStoreChatsPermission(): void {
        this.chatService.toggleStoreChatsPermission();
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
