import { Component, OnInit } from '@angular/core';
import {MainNavService} from "./main-nav.service";

@Component({
  selector: 'app-main-nav',
  templateUrl: './main-nav.component.html',
  styleUrls: ['./main-nav.component.scss']
})
export class MainNavComponent implements OnInit {

  constructor(
    public mainNavService: MainNavService
  ) { }

  ngOnInit(): void {
  }

  toggleNavExpanded() {
    this.mainNavService.expanded = !this.mainNavService.expanded;
  }
}
