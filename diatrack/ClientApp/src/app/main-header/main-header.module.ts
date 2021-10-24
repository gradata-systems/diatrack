import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainHeaderComponent } from './main-header.component';
import {MatButtonModule} from "@angular/material/button";
import {AppRoutingModule} from "../app-routing.module";
import {MatIconModule} from "@angular/material/icon";
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
