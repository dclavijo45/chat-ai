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

    @Output() toggleChatListE: EventEmitter<void>;

    toggleChatListV: boolean;
    
    toggleChatList(): void {
        this.toggleChatListV = !this.toggleChatListV;
        this.toggleChatListE.emit();
    }
}
