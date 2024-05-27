import { Pipe, inject, type PipeTransform } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { IHRole, IHistory, PartHistory } from '../interfaces/history.model';
import { MarkdownService } from 'ngx-markdown';

@Pipe({
    name: 'toggleChunkChat',
    standalone: true,
})
export class ToggleChunkChatPipe implements PipeTransform {
    constructor() {
        this.markdownService = inject(MarkdownService);
    }

    private markdownService: MarkdownService;

    transform(
        history: IHistory[],
        indexHistory: number,
        part: PartHistory,
        chunkChat: string
    ): string {
        if (indexHistory + 1 == history.length) {
            if (chunkChat == '') return this.markdownService.parse(part.text) as string;

            return this.markdownService.parse(chunkChat) as string;
        }

        return this.markdownService.parse(part.text) as string;
    }
}
