import { afterNextRender, ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { DialogService } from '@ngneat/dialog';
import { TippyDirective } from '@ngneat/helipopper';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ContextMenuModule } from '@perfectmemory/ngx-contextmenu';
import { i18nConstant } from '../../../../shared/constants/i18n.constant';
import { ThemeColorDirective } from '../../../../shared/directives/theme-color.directive';
import { ThemeColorEnum } from '../../../../shared/enums/theme-color.enum';
import { I18nLanguage } from '../../../../shared/interfaces/i18n.model';
import { ConfirmationModalComponent } from '../../../../shared/modals/confirmation-modal/confirmation-modal.component';
import { NotifyService } from '../../../../shared/services/notify.service';
import { ThemeColorService } from '../../../../shared/services/theme-color.service';
import { AiEngineEnum } from '../../enums/ai-engine.enum';
import { IChat } from '../../interfaces/chat.model';
import { ChatService } from '../../services/chat.service';
import { AuthService } from "../../services/auth.service";
import { User } from "@angular/fire/auth";

@Component({
    selector: 'chat-list',
    imports: [
        CommonModule,
        ThemeColorDirective,
        ContextMenuModule,
        TranslatePipe,
        TippyDirective,
    ],
    templateUrl: `./chat-list.component.html`,
    styleUrl: './chat-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatListComponent {
    constructor() {
        this.AiEngineEnum = AiEngineEnum;
        this.aiEngineList = Object.values(AiEngineEnum);

        afterNextRender(() => {
            this.chatService.loadStoredChats();
        });
    }

    /**
     * @description Service for managing chat data api
     */
    private chatService: ChatService = inject(ChatService);

    /**
     * @description Translate service for the app
     */
    private translateService: TranslateService = inject(TranslateService);

    /**
     * @description Service for managing notifications
     */
    private notifyService: NotifyService = inject(NotifyService);

    /**
     * @description Dialog service for managing modals and dialogs
     */
    private dialogService = inject(DialogService);

    /**
     * @description Service for managing authentication
     */
    private authService = inject(AuthService);

    /**
     * @description Change detector for the component
     */
    private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

    /**
     * @description Service for managing theme color design
     */
    themeColorService: ThemeColorService = inject(ThemeColorService);

    /**
     * @description List of chat data
     */
    chatList: Signal<IChat[]> = this.chatService.chatList;

    /**
     * @description Selected chat id
     */
    chatSelected: Signal<string> = this.chatService.chatSelect;

    /**
     * @description Selected chat ai engine
     */
    aiEngine: Signal<AiEngineEnum> = this.chatService.aiEngine;

    /**
     * @description Enum for ai engine
     */
    AiEngineEnum: typeof AiEngineEnum;

    /**
     * @description List of available ai engines
     */
    aiEngineList: AiEngineEnum[];

    /**
     * @description Theme color for the app
     */
    themeColor: Signal<ThemeColorEnum> = this.themeColorService.themeColor;

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
     * @description Current authenticated user
     */
    get userAuthenticated(): Signal<User | null> {
        return this.authService.listenUserAuthenticated;
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
     *
     * @param e event parent element for prevent click
     * @param chat chat to remove
     */
    async removeChat(e: Event, chat: IChat): Promise<void> {
        e.stopPropagation();

        const confirmation = await new Promise<boolean>((resolve) => {
            this.dialogService.open(ConfirmationModalComponent, {
                data: {
                    title: this.translateService.instant(
                        'chat.chat-list.confirmation-remove-chat-modal-title'
                    ),
                    message: this.translateService.instant(
                        'chat.chat-list.confirmation-remove-chat-modal-message'
                    ),
                    confirmButtonText: this.translateService.instant(
                        'chat.chat-list.confirmation-remove-chat-modal-confirm-button'
                    ),
                    cancelButtonText: this.translateService.instant(
                        'chat.chat-list.confirmation-remove-chat-modal-cancel-button'
                    ),
                },
                backdrop: true,
                enableClose: false
            }).afterClosed$.subscribe((result) => resolve(result ?? false));
        });

        if (!confirmation) {
            return;
        }

        this.chatService.removeChat(chat);
        this.cdr.detectChanges();
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
    async cleanChatList(): Promise<void> {
        const confirmation = await new Promise<boolean>((resolve) => {
            this.dialogService.open(ConfirmationModalComponent, {
                data: {
                    title: this.translateService.instant(
                        'chat.chat-list.confirmation-clean-chats-modal-title'
                    ),
                    message: this.translateService.instant(
                        'chat.chat-list.confirmation-clean-chats-modal-message'
                    ),
                    confirmButtonText: this.translateService.instant(
                        'chat.chat-list.confirmation-clean-chats-modal-confirm-button'
                    ),
                    cancelButtonText: this.translateService.instant(
                        'chat.chat-list.confirmation-clean-chats-modal-cancel-button'
                    ),
                },
                backdrop: true,
                enableClose: false
            }).afterClosed$.subscribe((result) => resolve(result ?? false));
        });

        if (!confirmation) {
            return;
        }

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

    /**
     * @description Login user with Google or logout if already logged in
     */
    login(): void {
        this.authService.loginWithGoogle();
    }

    /**
     * @description Logout user
     */
    logout(): void {
        this.authService.logout();
    }
}
