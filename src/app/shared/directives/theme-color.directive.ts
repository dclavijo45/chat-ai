import {
    Directive,
    ElementRef,
    Renderer2,
    inject
} from '@angular/core';
import { explicitEffect } from 'ngxtension/explicit-effect';
import { ThemeColorEnum } from '../enums/theme-color.enum';
import { ThemeColorService } from '../services/theme-color.service';

@Directive({
    selector: '[themeColor]',
    standalone: true,
})
export class ThemeColorDirective {
    constructor() {
        this.themeColorService = inject(ThemeColorService);
        this.elementRef = inject(ElementRef);
        this.renderer2 = inject(Renderer2);

        this.listenThemeColor();
    }

    /**
     * @description Theme color service for managing theme color
     */
    private themeColorService: ThemeColorService;

    /**
     * @description Element reference for accessing the html element
     */
    private elementRef: ElementRef;

    /**
     * @description Renderer2 for manipulating the html element
     */
    private renderer2: Renderer2;

    private listenThemeColor(): void {
        explicitEffect([this.themeColorService.themeColor], ([themeColor]) => {
            this.renderer2.addClass(this.elementRef.nativeElement, themeColor);
            this.renderer2.removeClass(
                this.elementRef.nativeElement,
                themeColor === ThemeColorEnum.dark
                    ? ThemeColorEnum.light
                    : ThemeColorEnum.dark
            );
        });
    }
}
