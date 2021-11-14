import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {DataSource} from "../../../../api/models/data-source";
import {DataSourceService} from "../../../../api/data-source.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {Observable, of} from "rxjs";
import {Clipboard} from "@angular/cdk/clipboard";
import {catchError} from "rxjs/operators";

@Component({
    selector: 'app-generate-share-token-dialog',
    templateUrl: './generate-share-token-dialog.component.html',
    styleUrls: ['./generate-share-token-dialog.component.scss']
})
export class GenerateShareTokenDialogComponent implements OnInit {

    readonly shareToken$: Observable<string>;
    error?: string;

    constructor(
        @Inject(MAT_DIALOG_DATA) public dataSource: DataSource,
        private dialogRef: MatDialogRef<GenerateShareTokenDialogComponent>,
        private dataSourceService: DataSourceService,
        private clipboard: Clipboard,
        private snackBar: MatSnackBar
    ) {
        this.shareToken$ = this.dataSourceService.generateShareToken(this.dataSource).pipe(catchError(error => {
            this.error = 'An error occurred when generating the token';
            return of('');
        }));
    }

    ngOnInit() {

    }

    copyTokenToClipboard(shareToken: string) {
        this.clipboard.copy(shareToken);
        this.snackBar.open('Token copied to clipboard');
    }
}
