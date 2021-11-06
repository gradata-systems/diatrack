import { Component, OnInit } from '@angular/core';
import {UserService} from "../../api/user.service";

@Component({
  selector: 'app-getting-started',
  templateUrl: './getting-started.component.html',
  styleUrls: ['./getting-started.component.scss']
})
export class GettingStartedComponent implements OnInit {

  constructor(
      private userService: UserService
  ) { }

  ngOnInit(): void {
      // Mark the user as not new, so this page won't be displayed again on startup
      this.userService.setUserIsNew(false);
  }
}
