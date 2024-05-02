import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';

import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { ThemeColorService } from '../../../../shared/services/theme-color.service';
import { ThemeColorEnum } from '../../../../shared/enums/theme-color.enum';

@Component({
    selector: 'chat-header',
    standalone: true,
    imports: [
        CommonModule,
    ],
    templateUrl: './chat-header.component.html',
    styleUrl: './chat-header.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatHeaderComponent {
    constructor(){
        this.toggleChatListE = new EventEmitter();

        this.toggleChatListV = false;

        this.themeColorService = inject(ThemeColorService);
    }

    themeColorService: ThemeColorService;

    @Output() toggleChatListE: EventEmitter<void>;

    toggleChatListV: boolean;

    get themeColor(): Observable<ThemeColorEnum> {
        return this.themeColorService.themeColor;
    }

    toggleChatList(): void {
        this.toggleChatListV = !this.toggleChatListV;
        this.toggleChatListE.emit();
    }
}
