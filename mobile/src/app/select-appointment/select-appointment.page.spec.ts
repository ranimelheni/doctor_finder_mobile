import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectAppointmentPage } from './select-appointment.page';

describe('SelectAppointmentPage', () => {
  let component: SelectAppointmentPage;
  let fixture: ComponentFixture<SelectAppointmentPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectAppointmentPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
