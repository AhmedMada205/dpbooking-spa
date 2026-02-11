import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingsprintComponent } from './bookingsprint.component';

describe('BookingsprintComponent', () => {
  let component: BookingsprintComponent;
  let fixture: ComponentFixture<BookingsprintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BookingsprintComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BookingsprintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
