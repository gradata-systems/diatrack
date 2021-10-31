import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewActivityLogEntryFabComponent } from './new-activity-log-entry-fab.component';

describe('NewActivityLogEntryFabComponent', () => {
  let component: NewActivityLogEntryFabComponent;
  let fixture: ComponentFixture<NewActivityLogEntryFabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewActivityLogEntryFabComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NewActivityLogEntryFabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
