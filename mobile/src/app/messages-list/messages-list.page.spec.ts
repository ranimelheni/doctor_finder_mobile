import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessagesListPage } from './messages-list.page';

describe('MessagesListPage', () => {
  let component: MessagesListPage;
  let fixture: ComponentFixture<MessagesListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MessagesListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
