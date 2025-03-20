import { ChangeDetectionStrategy, Component, EventEmitter, output, Output, OutputEmitterRef, signal, WritableSignal } from '@angular/core';

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
        this.toggleChatListV = signal(false);
    }

    /**
     * @description Emits an event to toggle the chat list
     */
    toggleChatListE: OutputEmitterRef<void> = output();

    /**
     * @description Toggles state the chat list
     */
    toggleChatListV: WritableSignal<boolean>;

    /**
     * @description Toggles the chat list
     */
    toggleChatList(): void {
        this.toggleChatListV.update((value) => !value);
        this.toggleChatListE.emit();
    }
}
