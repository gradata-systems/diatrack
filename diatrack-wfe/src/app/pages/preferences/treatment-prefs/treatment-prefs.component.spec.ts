import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentPrefsComponent } from './treatment-prefs.component';

describe('TreatmentPrefsComponent', () => {
  let component: TreatmentPrefsComponent;
  let fixture: ComponentFixture<TreatmentPrefsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TreatmentPrefsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TreatmentPrefsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
