import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PanelCentroPage } from './panel-centro.page';

describe('PanelCentroPage', () => {
  let component: PanelCentroPage;
  let fixture: ComponentFixture<PanelCentroPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PanelCentroPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
