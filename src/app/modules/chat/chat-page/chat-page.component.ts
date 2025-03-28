import { ChangeDetectionStrategy, Component, signal, WritableSignal } from '@angular/core';

import { ChatHeaderComponent } from '../components/chat-header/chat-header.component';
import { ChatHistoryComponent } from '../components/chat-history/chat-history.component';
import { ChatListComponent } from '../components/chat-list/chat-list.component';

@Component({
    selector: 'chat-page',
    imports: [ChatHeaderComponent, ChatListComponent, ChatHistoryComponent],
    templateUrl: './chat-page.component.html',
    styleUrl: './chat-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPageComponent {
    constructor() {
        this.toggleChatList = signal(false);
    }

    /**
     * @description Toggle state chat list
     */
    toggleChatList: WritableSignal<boolean>;

    /**
     * @description Toggle chat list
     */
    toggleChatListM(): void {
        this.toggleChatList.update((v) => !v);
    }
}
