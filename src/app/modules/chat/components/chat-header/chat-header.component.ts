import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';

import { CommonModule } from '@angular/common';
import { ThemeColorDirective } from '../../../../shared/directives/theme-color.directive';

@Component({
    selector: 'chat-header',
    imports: [
        CommonModule,
        ThemeColorDirective
    ],
    templateUrl: './chat-header.component.html',
    styleUrl: './chat-header.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatHeaderComponent {
    constructor(){
        this.toggleChatListE = new EventEmitter();

        this.toggleChatListV = false;
    }

    /**
     * @description Emits an event to toggle the chat list
     */
    @Output() toggleChatListE: EventEmitter<void>;

    /**
     * @description Toggles state the chat list
     */
    toggleChatListV: boolean;

    /**
     * @description Toggles the chat list
     */
    toggleChatList(): void {
        this.toggleChatListV = !this.toggleChatListV;
        this.toggleChatListE.emit();
    }
}
