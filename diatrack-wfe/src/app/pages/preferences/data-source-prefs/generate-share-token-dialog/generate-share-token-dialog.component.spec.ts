import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenerateShareTokenDialogComponent } from './generate-share-token-dialog.component';

describe('GenerateShareTokenDialogComponent', () => {
  let component: GenerateShareTokenDialogComponent;
  let fixture: ComponentFixture<GenerateShareTokenDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GenerateShareTokenDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GenerateShareTokenDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
