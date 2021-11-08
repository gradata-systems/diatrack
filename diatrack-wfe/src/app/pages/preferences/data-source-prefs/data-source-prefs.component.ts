import {Component, OnInit} from '@angular/core';
import {DataSourceService} from "../../../api/data-source.service";
import {MatDialog} from "@angular/material/dialog";
import {NewDataSourceDialogComponent} from "./new-data-source-dialog/new-data-source-dialog.component";
import {DataSource, DataSourceType} from "../../../api/models/data-source";
import {MatSnackBar} from "@angular/material/snack-bar";
import {DialogService} from "../../../common-dialog/common-dialog.service";
import {UserService} from "../../../api/user.service";
import {GenerateShareTokenDialogComponent} from "./generate-share-token-dialog/generate-share-token-dialog.component";

@Component({
    selector: 'app-data-source-prefs',
    templateUrl: './data-source-prefs.component.html',
    styleUrls: ['./data-source-prefs.component.scss']
})
export class DataSourcePrefsComponent {

    constructor(
        public dataSourceService: DataSourceService,
        public userService: UserService,
        private dialogService: DialogService,
        public dialog: MatDialog,
        public snackBar: MatSnackBar
    ) { }

    onCreateNewClicked() {
        const dialogRef = this.dialog.open(NewDataSourceDialogComponent, {
            width: '380px',
            data: {
                type: DataSourceType.Dexcom
            } as DataSource
        });

        dialogRef.afterClosed().subscribe((dataSource?: DataSource) => {
            if (dataSource) {
                this.snackBar.open(`Data source '${dataSource.name}' created`);
            }
        });
    }

    onDeleteClicked(dataSource: DataSource) {
        this.dialogService.warn('Remove data source?', [
            'Removing this data source will stop data collection and any alerts associated with it.',
            'The provider account itself will not be deleted.'
        ], {
            primary: { text: 'Remove', color: 'warn' },
            cancel: 'Cancel'
        }).subscribe(result => {
            if (result) {
                this.dataSourceService.removeDataSource(dataSource).subscribe(result => {
                    this.snackBar.open('Data source removed');
                }, error => {
                    this.dialogService.error('Remove data source', [
                        'Data source could not be removed.',
                        error.error.statusMessage
                    ], {
                        primary: { text: 'Close' }
                    });
                });
            }
        });
    }

    generateShareToken(dataSource: DataSource) {
        const dialogRef = this.dialog.open(GenerateShareTokenDialogComponent, {
            width: '400px',
            data: dataSource
        });

        dialogRef.afterClosed().subscribe();
    }
}
