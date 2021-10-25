import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA} from "@angular/material/dialog";
import {NotificationDialogOptions} from "./notification-dialog.definitions";

@Component({
  selector: 'app-notification-dialog',
  templateUrl: './notification-dialog.component.html',
  styleUrls: ['./notification-dialog.component.scss']
})
export class NotificationDialogComponent {

    readonly options: NotificationDialogOptions;
    messageLines: ReadonlyArray<string>;

    constructor(@Inject(MAT_DIALOG_DATA) public data: NotificationDialogOptions)
    {
        this.options = data;

        if (Array.isArray(data.message))
            this.messageLines = data.message;
        else
            this.messageLines = [data.message];
    }
}
