import {Component, OnInit} from '@angular/core';
import {DataSourceService} from "../../../api/data-source.service";
import {MatDialog} from "@angular/material/dialog";
import {NewDataSourceDialogComponent} from "./new-data-source-dialog/new-data-source-dialog.component";
import {DataSource, DataSourceType} from "../../../api/models/DataSource";
import {MatSnackBar} from "@angular/material/snack-bar";

@Component({
    selector: 'app-data-source-prefs',
    templateUrl: './data-source-prefs.component.html',
    styleUrls: ['./data-source-prefs.component.scss']
})
export class DataSourcePrefsComponent implements OnInit {

    constructor(
        public dataSourceService: DataSourceService,
        public dialog: MatDialog,
        public snackBar: MatSnackBar
    ) {
    }

    ngOnInit() {

    }

    onCreateNewClicked() {
        const dialogRef = this.dialog.open(NewDataSourceDialogComponent, {
            width: '300px',
            data: {
                type: DataSourceType.Dexcom
            } as DataSource
        });

        dialogRef.afterClosed().subscribe((dataSource?: DataSource) => {
            if (dataSource) {
                this.dataSourceService.addDataSource(dataSource).subscribe(result => {
                    if (result.ok) {
                        this.snackBar.open('Data source created');
                    } else {
                        this.snackBar.open('Data source creation failed');
                    }
                })
            }
        })
    }

    onDeleteClicked(dataSource: DataSource) {
        this.dataSourceService.removeDataSource(dataSource).subscribe(result => {
            if (result.ok) {
                this.snackBar.open('Data source removed');
            } else {
                this.snackBar.open('Data source could not be removed');
            }
        })
    }
}
