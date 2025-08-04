import {
    Directive,
    ElementRef,
    Renderer2,
    computed,
    effect,
    inject,
} from '@angular/core';
import { ThemeColorEnum } from '../enums/theme-color.enum';
import { ThemeColorService } from '../services/theme-color.service';

@Directive({
    selector: '[themeColor]',
    standalone: true,
})
export class ThemeColorDirective {
    constructor() {
        const themeColor = this.themeColorService.themeColor;

        computed(() => {
            this.renderer2.addClass(
                this.elementRef.nativeElement,
                themeColor()
            );

            this.renderer2.removeClass(
                this.elementRef.nativeElement,
                themeColor() === ThemeColorEnum.dark
                    ? ThemeColorEnum.light
                    : ThemeColorEnum.dark
            );
        });
    }

    /**
     * @description Theme color service for managing theme color
     */
    private themeColorService: ThemeColorService = inject(ThemeColorService);

    /**
     * @description Element reference for accessing the html element
     */
    private elementRef: ElementRef = inject(ElementRef);

    /**
     * @description Renderer2 for manipulating the html element
     */
    private renderer2: Renderer2 = inject(Renderer2);
}
