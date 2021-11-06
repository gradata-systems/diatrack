import {Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {NotificationDialogButtons, NotificationDialogOptions} from "./notification-dialog/notification-dialog.definitions";
import {NotificationDialogComponent} from "./notification-dialog/notification-dialog.component";
import {Observable} from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class DialogService {
    constructor(
        private dialog: MatDialog
    ) {
    }

    /**
     * Displays an informational dialog to the user
     */
    info(title: string, message: string | Array<string>, buttons?: NotificationDialogButtons): Observable<boolean | undefined> {
        return this.notificationDialog({
            title,
            message,
            buttons,
            icon: 'info_outline',
            color: 'white'
        });
    }

    question(title: string, message: string | Array<string>, buttons?: NotificationDialogButtons): Observable<boolean | undefined> {
        return this.notificationDialog({
            title,
            message,
            buttons,
            icon: 'help_outline',
            color: 'white'
        });
    }

    warn(title: string, message: string | Array<string>, buttons?: NotificationDialogButtons): Observable<boolean | undefined> {
        return this.notificationDialog({
            title,
            message,
            buttons,
            icon: 'warning_amber',
            color: 'orange'
        });
    }

    error(title: string, message: string | Array<string>, buttons?: NotificationDialogButtons): Observable<boolean | undefined> {
        return this.notificationDialog({
            title,
            message,
            buttons,
            icon: 'error_outline',
            color: '#FF2F4BFF'
        });
    }

    private notificationDialog(options: NotificationDialogOptions): Observable<boolean | undefined> {
        return this.dialog.open<NotificationDialogComponent, NotificationDialogOptions>(NotificationDialogComponent, {
            maxWidth: '450px',
            data: options
        }).afterClosed();
    }
}
