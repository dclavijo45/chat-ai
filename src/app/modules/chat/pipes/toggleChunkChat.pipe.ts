import { Pipe, type PipeTransform } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { IHistory } from '../interfaces/history.model';

@Pipe({
    name: 'toggleChunkChat',
    standalone: true,
})
export class ToggleChunkChatPipe implements PipeTransform {
    transform(
        history: IHistory[],
        chatHistoryIndex: number,
        chatHistory: IHistory,
        chunkChat: string
    ): SafeHtml {
        if (chatHistoryIndex + 1 != history.length && chatHistory.parts.length)
            return chatHistory.parts[0].text;

        if (
            history[history.length - 1].role == 'model' &&
            history[history.length - 1].parts.length &&
            history[history.length - 1].parts[0].text == ''
        ) {
            if (chunkChat == '') return '...';

            return chunkChat;
        }

        return history[history.length - 1].parts.length
            ? chatHistory.parts[0].text
            : '';
    }
}
