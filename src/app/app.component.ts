import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateConfigService } from './shared/services/translate-config.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet],
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
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
