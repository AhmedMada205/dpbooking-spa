import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingService, BookingType } from '../../../services/booking.service';
import { ToastrService } from 'ngx-toastr';
import { MealService, Meal } from '../../../services/meal.service';
import { VenueService } from '../../../services/venue.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-edit-booking',
  templateUrl: './edit-booking.component.html',
  styleUrls: ['./edit-booking.component.scss'],
})
export class EditBookingComponent implements OnInit {
  bookingForm!: FormGroup;
  isSubmitting = false;
  bookingId!: number;

  venues: any[] = [];
  mealsList: Meal[] = [];
  allMeals: Meal[] = [];

  selectedVenueId!: number;
  isCustomPrice = false;

bookingTypes = [
  { id: BookingType.Wedding, name: 'زفاف' },
  { id: BookingType.ShipTrip, name: 'رحلة بحرية' },
  { id: BookingType.Engagement, name: 'خطوبة' },
  { id: BookingType.Birthday, name: 'عيد ميلاد' },
  { id: BookingType.RamadanIftar, name: 'إفطار رمضان' }, // 5
  { id: BookingType.RamadanSuhoor, name: 'سحور رمضان' }, // 6
  { id: BookingType.GardenParty, name: 'حفلة حديقة' },
  { id: BookingType.Conference, name: 'مؤتمر' },
  { id: BookingType.Other, name: 'أخرى' },
];
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
    private mealService: MealService,
    private venueService: VenueService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.bookingId = +this.route.snapshot.paramMap.get('id')!;
    console.log('Booking ID:', this.bookingId);

    this.initForm();

    // أولاً نحمّل الأماكن والوجبات ثم الحجز
    this.venueService.getAll().subscribe({
      next: (res) => {
        this.venues = res.filter((v) => v.isAvailable);

        this.mealService.getAllMeals().subscribe({
          next: (data) => {
            this.allMeals = data;
            this.loadBooking(); // بعد أن تكون البيانات جاهزة
          },
          error: () => this.toastr.error('فشل تحميل الوجبات'),
        });
      },
      error: () => this.toastr.error('فشل تحميل الأماكن'),
    });
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
      venueExtraPrice: [0, [Validators.min(0)]],
      bookingType: ['Iftar', Validators.required],
      bookingDate: [''],
      bookingTime: ['18:00', Validators.required],
      numberOfPeople: [1, [Validators.required, Validators.min(1)]],
      paymentMethod: [null],
      receiptNumber: ['', Validators.required],
      depositAmount: [0, [Validators.min(0)]],
      note: [''],
      meals: this.fb.array([]),
    });
  }

  // ================= Load Booking =================
 loadBooking(): void {
  if (!this.bookingId) return;

  this.bookingService.getBookingById(this.bookingId).subscribe({
    next: (res) => {
      const b = res.data; // 🔥 مهم جداً: data جوا الكائن
      console.log('Booking data:', b);

      if (!b) return;

      this.bookingForm.patchValue({
        clientName: b.clientName,
        clientPhone: b.clientPhone,
        venueId: +b.venueId,
        venueExtraPrice: b.venuePrice || 0,
bookingType: b.bookingType,
        bookingDate: b.bookingDate ? b.bookingDate.split('T')[0] : '',
        bookingTime: b.bookingTime || '18:00',
        numberOfPeople: b.guestsCount,
        paymentMethod: b.paymentMethod,
        receiptNumber: b.receiptNumber,
        depositAmount: b.depositAmount,
        note: b.note,
      });

      this.selectedVenueId = +b.venueId;
      this.filterMealsByVenue();

      this.meals.clear();
      if (b.bookingMeals && b.bookingMeals.length) {
        b.bookingMeals.forEach((m: any) => {
          this.meals.push(
            this.fb.group({
              MealId: +m.mealId,
              Quantity: m.quantity,
              UnitPrice: m.unitPrice,
            })
          );
        });
      } else {
        this.addMeal();
      }

      this.isCustomPrice = !!b.venuePrice;
    },
    error: () => this.toastr.error('فشل تحميل بيانات الحجز'),
  });
}


  // ================= Meals =================
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
        MealId: meal.mealId,
        Quantity: 1,
        UnitPrice: price,
      })
    );
  }

  removeMeal(index: number): void {
    if (this.meals.length > 1) this.meals.removeAt(index);
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

    group.patchValue({ UnitPrice: price, Quantity: 1 });
  }

  filterMealsByVenue(): void {
    if (this.selectedVenueId === 8) {
      this.mealsList = this.allMeals.filter(
        (m) => m.specialPrice && m.specialPrice > 0
      );
    } else {
      this.mealsList = [...this.allMeals];
    }
  }

  onVenueChange(): void {
    this.selectedVenueId = +this.bookingForm.get('venueId')!.value;
    this.filterMealsByVenue();
    this.meals.clear();
    this.addMeal();
  }

  onVenuePriceOptionChange(event: any) {
    const value = +event.target.value;
    if (value === 0) {
      this.isCustomPrice = false;
      this.bookingForm.get('venueExtraPrice')?.setValue(0);
    } else {
      this.isCustomPrice = true;
      this.bookingForm.get('venueExtraPrice')?.setValue(null);
    }
  }

  // ================= Totals =================
  getMealTotal(i: number): number {
    const m = this.meals.at(i);
    return (m.get('Quantity')!.value || 0) * (m.get('UnitPrice')!.value || 0);
  }

  getTotalMealsPrice(): number {
    return this.meals.controls.reduce(
      (sum, _, i) => sum + this.getMealTotal(i),
      0
    );
  }

  getServiceCharge(): number {
    return this.getTotalMealsPrice() * environment.TAX_RATE;
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
      BookingId: this.bookingId,
      ClientName: v.clientName,
      ClientPhone: v.clientPhone,
      GuestsCount: v.numberOfPeople,
      BookingType: v.bookingType,
      BookingDate: v.bookingDate,
      BookingTime: v.bookingTime,
      VenueId: v.venueId,
      VenuePrice: v.venueExtraPrice,
      TotalAmount: this.getFinalTotal(),
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
    this.bookingService.updateBooking(request).subscribe({
      next: () => {
        this.toastr.success('تم تعديل الحجز بنجاح');
        this.router.navigate(['/bookings']);
        this.isSubmitting = false;
      },
      error: () => (this.isSubmitting = false),
    });
  }

  private markTouched(group: FormGroup | FormArray): void {
    Object.values(group.controls).forEach((c) => {
      c.markAsTouched();
      if (c instanceof FormGroup || c instanceof FormArray) this.markTouched(c);
    });
  }
}
