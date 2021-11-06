import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewDataSourceDialogComponent } from './new-data-source-dialog.component';

describe('NewDataSourceDialogComponent', () => {
  let component: NewDataSourceDialogComponent;
  let fixture: ComponentFixture<NewDataSourceDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewDataSourceDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NewDataSourceDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
