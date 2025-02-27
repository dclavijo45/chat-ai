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

    /**
     * @description Instance of Notify class from simple-notify library
     */
    private Notify: typeof Notify | null;

    /**
     * @description Show a notification with the specified parameters
     * @param status type of notification
     * @param text text of the notification
     * @param title title of the notification (optional)
     */
    private notify(
        status: 'error' | 'success' | 'warning' | 'info',
        text: string,
        title: string | undefined = undefined
    ): void {
        if (this.Notify) {
            new this.Notify({
                status,
                title,
                text,
                effect: 'fade',
                speed: 300,
                showIcon: true,
                showCloseButton: false,
                autoclose: true,
                autotimeout: 3000,
                type: 'outline',
                position: 'right top',
            });
        }
    }

    /**
     * @description Show a notification of error
     * @param text text of the notification
     * @param title title of the notification (optional)
     */
    error(text: string, title: string | undefined = undefined): void {
        this.notify('error', text, title);
    }

    /**
     * @description Show a notification of success
     * @param text text of the notification
     * @param title title of the notification (optional)
     */
    success(text: string, title: string | undefined = undefined): void {
        this.notify('success', text, title);
    }

    /**
     * @description Show a notification of warning
     * @param text text of the notification
     * @param title title of the notification (optional)
     */
    warning(text: string, title: string | undefined = undefined): void {
        this.notify('warning', text, title);
    }

    /**
     * @description Show a notification of info
     * @param text text of the notification
     * @param title title of the notification (optional)
     */
    info(text: string, title: string | undefined = undefined): void {
        this.notify('info', text, title);
    }
}
