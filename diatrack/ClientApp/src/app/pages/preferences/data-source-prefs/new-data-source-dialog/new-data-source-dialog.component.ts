import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {DataSource} from "../../../../api/models/DataSource";
import {DataSourceService} from "../../../../api/data-source.service";

@Component({
    selector: 'app-new-data-source-dialog',
    templateUrl: './new-data-source-dialog.component.html',
    styleUrls: ['./new-data-source-dialog.component.scss']
})
export class NewDataSourceDialogComponent implements OnInit {

    constructor(
        public dialogRef: MatDialogRef<NewDataSourceDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DataSource,
        private dataSourceService: DataSourceService
    ) { }

    ngOnInit() {

    }

}
