import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingService } from '../../../services/booking.service';
import { ToastrService } from 'ngx-toastr';
import { MealService, Meal } from '../../../services/meal.service';
import { VenueService } from 'src/app/services/venue.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-new-booking',
  templateUrl:'./new-booking.component.html',
  styleUrls: ['./new-booking.component.scss'],
})
export class NewBookingComponent implements OnInit {
  bookingForm!: FormGroup;
  isSubmitting = false;
  todayDate = new Date().toISOString().split('T')[0];

  venues: any[] = [];
  mealsList: Meal[] = [];
  allMeals: Meal[] = [];

  selectedVenueId!: number;

  paymentMethods = [
    { id: 1, name: 'نقدي' },
    { id: 2, name: 'فيزا / كارت' },
    { id: 3, name: 'تحويل بنكي' },
    { id: 4, name: 'فوري' },
    { id: 5, name: 'أخرى' },
  ];

  constructor(
    private fb: FormBuilder,
    private bookingService: BookingService,
    private router: Router,
    private mealService: MealService,
    private toastr: ToastrService,
    private venueService: VenueService,
  ) {}

  // ================= Init =================
  ngOnInit(): void {
    this.initForm();
    this.loadMeals();
    this.loadVenues();
  }

  // ================= Form =================
  initForm(): void {
    this.bookingForm = this.fb.group({
      clientName: ['', [Validators.required, Validators.minLength(2)]],
      clientPhone: [
        '',
        [Validators.required, Validators.pattern(/^01[0125][0-9]{8}$/)],
      ],
      venueId: [null, Validators.required],
      venueExtraPrice: [0, [Validators.min(0)]], // ✅ سعر المكان اللي ممكن المستخدم يدخله
      bookingType: ['Iftar', Validators.required],
      bookingDate: [this.todayDate, Validators.required],
      bookingTime: ['18:00', Validators.required],
      numberOfPeople: [1, [Validators.required, Validators.min(1)]],
      paymentMethod: [null],
      receiptNumber: ['', Validators.required],
      depositAmount: [0, [Validators.min(0)]],
      note: [''],
      meals: this.fb.array([]),
    });
  }

  // ================= Venues =================
  loadVenues(): void {
    this.venueService.getAll().subscribe({
      next: (res) => (this.venues = res.filter((v) => v.isAvailable)),
      error: () => this.toastr.error('فشل تحميل الأماكن'),
    });
  }

  onVenueChange(): void {
    this.selectedVenueId = +this.bookingForm.get('venueId')!.value;

    this.filterMealsByVenue();

    this.meals.clear();
    this.addMeal();
  }

  // ================= Meals =================
  loadMeals(): void {
    this.mealService.getAllMeals().subscribe({
      next: (data) => {
        this.allMeals = data;
        this.filterMealsByVenue();
      },
      error: () => this.toastr.error('فشل تحميل الوجبات'),
    });
  }

  filterMealsByVenue(): void {
    if (this.selectedVenueId === 8) {
      this.mealsList = this.allMeals.filter(
        (m) => m.specialPrice && m.specialPrice > 0,
      );
    } else {
      this.mealsList = [...this.allMeals];
    }
  }

  get meals(): FormArray {
    return this.bookingForm.get('meals') as FormArray;
  }

  addMeal(): void {
    if (this.mealsList.length === 0) return;

    const meal = this.mealsList[0];

    const price =
      this.selectedVenueId === 8 && meal.specialPrice
        ? meal.specialPrice
        : meal.price;

    this.meals.push(
      this.fb.group({
        MealId: [meal.mealId, Validators.required],
        Quantity: [1, [Validators.required, Validators.min(1)]],
        UnitPrice: [price, [Validators.required, Validators.min(0)]],
      }),
    );
  }

  removeMeal(index: number): void {
    if (this.meals.length > 1) {
      this.meals.removeAt(index);
    }
  }

  onMealChange(index: number): void {
    const group = this.meals.at(index);
    const mealId = +group.get('MealId')!.value;

    const meal = this.mealsList.find((m) => m.mealId === mealId);
    if (!meal) return;

    const price =
      this.selectedVenueId === 8 && meal.specialPrice
        ? meal.specialPrice
        : meal.price;

    group.patchValue({
      UnitPrice: price,
      Quantity: 1,
    });
  }

  // ================= Totals =================
getMealTotal(i: number): number {
  const m = this.meals.at(i);
  return (m.get('Quantity')!.value || 0) * (m.get('UnitPrice')!.value || 0);
}

getTotalMealsPrice(): number {
  return this.meals.controls.reduce(
    (sum, _, i) => sum + this.getMealTotal(i),
    0,
  );
}

getServiceCharge(): number {
  return this.getTotalMealsPrice() *environment.TAX_RATE;
}

getFinalTotal(): number {
  const venuePrice = this.bookingForm.get('venueExtraPrice')?.value || 0;
  return this.getTotalMealsPrice() + this.getServiceCharge() + venuePrice;
}

  // ================= Submit =================
  submitBooking(): void {
    if (this.bookingForm.invalid) {
      this.markTouched(this.bookingForm);
      this.toastr.warning('راجع البيانات المطلوبة');
      return;
    }

    const v = this.bookingForm.value;

    const request = {
      ClientName: v.clientName,
      ClientPhone: v.clientPhone,
      GuestsCount: v.numberOfPeople,
      BookingType: v.bookingType,
      BookingDate: v.bookingDate,
      BookingTime: v.bookingTime,
      VenueId: v.venueId,
      VenueExtraPrice: v.venueExtraPrice ?? 0, // ✅ السعر النهائي للمكان
    TotalAmount: this.getFinalTotal() + (v.venueExtraPrice ?? 0),
      DepositAmount: v.depositAmount || 0,
      PaymentMethod: v.paymentMethod,
      ReceiptNumber: v.receiptNumber,
      Note: v.note,
      Meals: this.meals.controls.map((m) => ({
        MealId: m.get('MealId')!.value,
        Quantity: m.get('Quantity')!.value,
        UnitPrice: m.get('UnitPrice')!.value,
      })),
    };

    this.isSubmitting = true;

    this.bookingService.createBooking(request).subscribe({
      next: () => {
        this.toastr.success('تم إنشاء الحجز');
        this.router.navigate(['/bookings']);
        this.isSubmitting = false;
      },
      error: () => {
        // this.toastr.error('حدث خطأ أثناء الحجز');
        this.isSubmitting = false;
      },
    });
  }


  isCustomPrice = false;

onVenuePriceOptionChange(event: any) {
  const value = +event.target.value;

  if (value === 0) { // مجاني
    this.isCustomPrice = false;
    this.bookingForm.get('venueExtraPrice')?.setValue(0);
  } else { // سعر خاص
    this.isCustomPrice = true;
    this.bookingForm.get('venueExtraPrice')?.setValue(null);
  }
}
decrementPeople(): void {
  const current = this.bookingForm.get('numberOfPeople')?.value || 1;
  if (current > 1) {
    this.bookingForm.get('numberOfPeople')?.setValue(current - 1);
  }
}

incrementPeople(): void {
  const current = this.bookingForm.get('numberOfPeople')?.value || 1;
  this.bookingForm.get('numberOfPeople')?.setValue(current + 1);
}

decrementQuantity(index: number): void {
  const group = this.meals.at(index);
  const current = group.get('Quantity')?.value || 1;
  if (current > 1) {
    group.get('Quantity')?.setValue(current - 1);
  }
}

incrementQuantity(index: number): void {
  const group = this.meals.at(index);
  const current = group.get('Quantity')?.value || 1;
  group.get('Quantity')?.setValue(current + 1);
}

previewBooking(): void {
  if (this.bookingForm.invalid) {
    this.markTouched(this.bookingForm);
    this.toastr.warning('يرجى ملء جميع الحقول المطلوبة');
    return;
  }
  
  // يمكنك إضافة معاينة للحجز هنا
  this.toastr.info('خاصية المعاينة قريباً', 'قيد التطوير');
}
environment = environment;
  // ================= Helpers =================
  private markTouched(group: FormGroup | FormArray): void {
    Object.values(group.controls).forEach((c) => {
      c.markAsTouched();
      if (c instanceof FormGroup || c instanceof FormArray) {
        this.markTouched(c);
      }
    });
  }


  

}
