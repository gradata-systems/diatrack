import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MainHeaderComponent} from './main-header.component';
import {AppRoutingModule} from "../app-routing.module";
import {AppCoreModule} from "../app-core.module";


@NgModule({
    imports: [
        CommonModule,
        AppCoreModule,
        AppRoutingModule
    ],
    exports: [
        MainHeaderComponent
    ],
    declarations: [
        MainHeaderComponent
    ]
})
export class MainHeaderModule { }
