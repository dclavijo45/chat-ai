import { Pipe, type PipeTransform } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { IHRole, IHistory, PartHistory } from '../interfaces/history.model';

@Pipe({
    name: 'toggleChunkChat',
    standalone: true,
})
export class ToggleChunkChatPipe implements PipeTransform {
    transform(
        history: IHistory[],
        indexHistory: number,
        part: PartHistory,
        chunkChat: string
    ): SafeHtml {
        if (history[history.length - 1].role == IHRole.user) {
            return part.text;
        }

        if (indexHistory + 1 == history.length) {
            if (chunkChat == '') return part.text;
            
            return chunkChat;
        }

        return part.text;
    }
}
