import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewActivityLogEntryDialogComponent } from './new-activity-log-entry-dialog.component';

describe('NewActivityLogEntryDialogComponent', () => {
  let component: NewActivityLogEntryDialogComponent;
  let fixture: ComponentFixture<NewActivityLogEntryDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewActivityLogEntryDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NewActivityLogEntryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
