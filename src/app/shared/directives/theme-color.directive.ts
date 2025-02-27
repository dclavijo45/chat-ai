import {
    Directive,
    ElementRef,
    OnDestroy,
    OnInit,
    Renderer2,
    inject,
} from '@angular/core';
import { ThemeColorService } from '../services/theme-color.service';
import { Subscription } from 'rxjs';
import { ThemeColorEnum } from '../enums/theme-color.enum';

@Directive({
    selector: '[themeColor]',
    standalone: true,
})
export class ThemeColorDirective implements OnInit, OnDestroy {
    constructor() {
        this.themeColorService = inject(ThemeColorService);
        this.elementRef = inject(ElementRef);
        this.renderer2 = inject(Renderer2);

        this.destroy$ = new Subscription();
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

    /**
     * @description Subscription for unsubscribing the observable
     */
    private destroy$: Subscription;

    ngOnInit(): void {
        const $ = this.themeColorService.themeColor
            .subscribe((themeColor) => {
                if (themeColor == ThemeColorEnum.dark) {
                    this.renderer2.addClass(this.elementRef.nativeElement, ThemeColorEnum.dark);
                    this.renderer2.removeClass(this.elementRef.nativeElement, ThemeColorEnum.light);
                }

                if (themeColor == ThemeColorEnum.light) {
                    this.renderer2.addClass(this.elementRef.nativeElement, ThemeColorEnum.light);
                    this.renderer2.removeClass(this.elementRef.nativeElement, ThemeColorEnum.dark);
                }
            });

        this.destroy$.add($);
    }

    ngOnDestroy(): void {
        this.destroy$ ? this.destroy$.unsubscribe() : false;
    }
}
