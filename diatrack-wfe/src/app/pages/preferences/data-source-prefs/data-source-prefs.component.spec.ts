import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataSourcePrefsComponent } from './data-source-prefs.component';

describe('DataSourcePrefsComponent', () => {
  let component: DataSourcePrefsComponent;
  let fixture: ComponentFixture<DataSourcePrefsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DataSourcePrefsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DataSourcePrefsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
