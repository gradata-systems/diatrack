import {Component, OnInit} from '@angular/core';
import {DataSourceService} from "../../../api/data-source.service";
import {MatDialog} from "@angular/material/dialog";
import {NewDataSourceDialogComponent} from "./new-data-source-dialog/new-data-source-dialog.component";
import {DataSource, DataSourceType} from "../../../api/models/DataSource";
import {MatSnackBar} from "@angular/material/snack-bar";
import {DialogService} from "../../../common-dialog/common-dialog.service";
import {UserService} from "../../../api/user.service";

@Component({
    selector: 'app-data-source-prefs',
    templateUrl: './data-source-prefs.component.html',
    styleUrls: ['./data-source-prefs.component.scss']
})
export class DataSourcePrefsComponent implements OnInit {

    constructor(
        public dataSourceService: DataSourceService,
        public userService: UserService,
        private dialogService: DialogService,
        public dialog: MatDialog,
        public snackBar: MatSnackBar
    ) {
    }

    ngOnInit() {

    }

    onCreateNewClicked() {
        const dialogRef = this.dialog.open(NewDataSourceDialogComponent, {
            width: '350px',
            data: {
                type: DataSourceType.Dexcom
            } as DataSource
        });

        dialogRef.afterClosed().subscribe((dataSource?: DataSource) => {
            if (dataSource) {
                this.userService.refreshUserProfile();
                this.snackBar.open(`Data source '${dataSource.name}' created`);
            }
        })
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
                this.userService.refreshUserProfile();
                this.dataSourceService.removeDataSource(dataSource).subscribe(result => {
                    this.userService.refreshUserProfile();
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
}
