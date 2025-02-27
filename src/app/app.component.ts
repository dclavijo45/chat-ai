import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateConfigService } from './modules/chat/services/translate-config.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
})
export class AppComponent {
    constructor() {
        this.translateConfigService = inject(TranslateConfigService);

        this.translateConfigService.setUp();
    }

    /**
     * @description Translate service for init configuration
     */
    private translateConfigService: TranslateConfigService;
}
