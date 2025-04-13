import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddAttachmentPage } from './add-attachment.page';

describe('AddAttachmentPage', () => {
  let component: AddAttachmentPage;
  let fixture: ComponentFixture<AddAttachmentPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddAttachmentPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
