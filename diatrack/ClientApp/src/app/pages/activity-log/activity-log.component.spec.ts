import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityLogPageComponent } from './activity-log.component';

describe('ActivityLogComponent', () => {
  let component: ActivityLogPageComponent;
  let fixture: ComponentFixture<ActivityLogPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ActivityLogPageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityLogPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
