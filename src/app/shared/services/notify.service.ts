import { Injectable, afterNextRender } from '@angular/core';
import Notify from 'simple-notify';

@Injectable({
    providedIn: 'root',
})
export class NotifyService {
    constructor() {
        this.Notify = null;

        afterNextRender(async () => {
            await import('simple-notify').then((module) => {
                this.Notify = module.default;
            });
        });
    }

    private Notify: typeof Notify | null;

    /**
     * Muestra una notificación de error
     * @param text texto de la notificación
     * @param title titulo de la notificación (opcional)
     */
    error(text: string, title: string | undefined = undefined): void {
        if (this.Notify) {
            new this.Notify({
                status: 'error',
                title,
                text,
                effect: 'fade',
                speed: 300,
                showIcon: true,
                showCloseButton: false,
                autoclose: true,
                autotimeout: 5000,
                type: 'outline',
                position: 'right top',
            });
        }
    }

    /**
     * Muestra una notificación de éxito
     * @param text texto de la notificación
     * @param title titulo de la notificación (opcional)
     */
    success(text: string, title: string | undefined = undefined): void {
        if (this.Notify) {
            new this.Notify({
                status: 'success',
                title,
                text,
                effect: 'fade',
                speed: 300,
                showIcon: true,
                showCloseButton: true,
                autoclose: true,
                autotimeout: 3000,
                type: 'outline',
                position: 'right top',
            });
        }
    }

    /**
     * Muestra una notificación de advertencia
     * @param text texto de la notificación
     * @param title titulo de la notificación (opcional)
     */
    warning(text: string, title: string | undefined = undefined): void {
        if (this.Notify) {
            new this.Notify({
                status: 'warning',
                title,
                text,
                effect: 'fade',
                speed: 300,
                showIcon: true,
                showCloseButton: true,
                autoclose: true,
                autotimeout: 3000,
                type: 'outline',
                position: 'right top',
            });
        }
    }

    /**
     * Muestra una notificación de información
     * @param text texto de la notificación
     * @param title titulo de la notificación (opcional)
     */
    info(text: string, title: string | undefined = undefined): void {
        if (this.Notify) {
            new this.Notify({
                status: 'info',
                title,
                text,
                effect: 'fade',
                speed: 300,
                showIcon: true,
                showCloseButton: true,
                autoclose: true,
                autotimeout: 3000,
                type: 'outline',
                position: 'right top',
            });
        }
    }
}
