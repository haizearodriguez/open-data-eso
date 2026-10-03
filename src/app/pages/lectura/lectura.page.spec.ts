import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LecturaPage } from './lectura.page';

describe('LecturaPage', () => {
  let component: LecturaPage;
  let fixture: ComponentFixture<LecturaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LecturaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
