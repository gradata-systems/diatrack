import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {DataSource, DataSourceType} from "../../../../api/models/data-source";
import {DataSourceService} from "../../../../api/data-source.service";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {MatSnackBar} from "@angular/material/snack-bar";
import {DialogService} from "../../../../common-dialog/common-dialog.service";
import {HttpErrorResponse} from "@angular/common/http";

@Component({
    selector: 'app-new-data-source-dialog',
    templateUrl: './new-data-source-dialog.component.html',
    styleUrls: ['./new-data-source-dialog.component.scss']
})
export class NewDataSourceDialogComponent implements OnInit {

    readonly formGroup: FormGroup;
    error: string | null = null;
    inProgress = false;

    readonly dataSourceType = DataSourceType;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: DataSource,
        private dialogRef: MatDialogRef<NewDataSourceDialogComponent>,
        private dataSourceService: DataSourceService,
        private dialogService: DialogService,
        private snackBar: MatSnackBar,
        fb: FormBuilder
    ) {
        this.formGroup = fb.group({
            type: fb.control(DataSourceType.Dexcom, Validators.required),
            regionId: fb.control('', Validators.required),
            loginId: fb.control('', Validators.required),
            password: fb.control('', Validators.required),
            name: fb.control('', Validators.required)
        });
    }

    ngOnInit() {

    }

    onSubmit() {
        if (this.formGroup.valid) {
            this.inProgress = true;
            this.dataSourceService.addDataSource(this.formGroup.value).subscribe(result => {
                this.dialogRef.close(this.formGroup.value);
            }, (error: HttpErrorResponse) => {
                this.inProgress = false;
                this.error = error.error?.detail || 'Error occurred when registering account';
            })
        }
    }
}
