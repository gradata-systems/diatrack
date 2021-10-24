import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainHeaderComponent } from './main-header.component';
import {MatButtonModule} from "@angular/material/button";
import {AppRoutingModule} from "../app-routing.module";
import {MatIconModule} from "@angular/material/icon";



@NgModule({
    declarations: [
        MainHeaderComponent
    ],
    exports: [
        MainHeaderComponent
    ],
    imports: [
        CommonModule,
        MatButtonModule,
        AppRoutingModule,
        MatIconModule
    ]
})
export class MainHeaderModule { }
