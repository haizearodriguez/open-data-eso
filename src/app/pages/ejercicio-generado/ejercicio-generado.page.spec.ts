import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EjercicioGeneradoPage } from './ejercicio-generado.page';

describe('EjercicioGeneradoPage', () => {
  let component: EjercicioGeneradoPage;
  let fixture: ComponentFixture<EjercicioGeneradoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EjercicioGeneradoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
