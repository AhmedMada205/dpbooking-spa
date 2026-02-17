import { Component, OnInit } from '@angular/core';
import {
  BookingService,
  Booking,
  BookingType,
  BookingStatus,
} from 'src/app/services/booking.service';

import { VenueService } from 'src/app/services/venue.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { BookingsComponent } from '../bookings/bookings.component';
import { ReportprintService } from 'src/app/services/reportprint.service';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
})
export class CalendarComponent implements OnInit {
  // الحجوزات الكاملة
  allBookings: Booking[] = [];

  // إحصائيات التقويم
  totalBookings = 0;
  confirmedBookings = 0;
  pendingBookings = 0;
  cancelledBookings = 0;
  postponedBookings = 0;
  completedBookings = 0;
  totalRevenue = 0;

  // التقويم
  currentDate = new Date();
  currentMonth: number;
  currentYear: number;
  monthName = '';
  daysInMonth: any[] = [];

  // اليوم المحدد
  selectedDate: Date | null = null;
  selectedDayBookings: Booking[] = [];

  // الأماكن
  venues: any[] = [];

  // حالة التحميل
  loading = false;

  // الأسماء العربية لأيام الأسبوع
  weekDays = [
    { name: 'الأحد', class: 'sunday' },
    { name: 'الإثنين', class: 'monday' },
    { name: 'الثلاثاء', class: 'tuesday' },
    { name: 'الأربعاء', class: 'wednesday' },
    { name: 'الخميس', class: 'thursday' },
    { name: 'الجمعة', class: 'friday' },
    { name: 'السبت', class: 'saturday' },
  ];

  BookingStatus = BookingStatus;
  BookingType = BookingType;

  constructor(
    private bookingService: BookingService,
    private venueService: VenueService,
    private toastr: ToastrService,
    private bookingsComponent: BookingsComponent,
    private ReportprintService: ReportprintService,
    private router: Router,
  ) {
    this.currentMonth = this.currentDate.getMonth();
    this.currentYear = this.currentDate.getFullYear();
  }

  ngOnInit(): void {
    this.fetchBookings();
    this.loadVenues();
    this.generateCalendar();
  }

  // ================= جلب الحجوزات =================
  fetchBookings(): void {
    this.loading = true;
    this.bookingService.getAllBookings().subscribe({
      next: (data) => {
        // نفس طريقة التحويل الموجودة في bookings.component
        this.allBookings = data.map((b) => ({
          ...b,
          bookingType:
            BookingType[b.bookingType as unknown as keyof typeof BookingType],
          bookingStatus:
            BookingStatus[
              b.bookingStatus as unknown as keyof typeof BookingStatus
            ],
        }));

        this.calculateStatistics(); // <-- اتأكد إنها موجودة هنا
        this.generateCalendar();
        this.loading = false;
        this.toastr.success('تم تحميل الحجوزات بنجاح');
      },
      error: (err) => {
        console.error('Error fetching bookings:', err);
        this.toastr.error('حدث خطأ أثناء جلب الحجوزات');
        this.loading = false;
      },
    });
  }
  // ================= تحميل الأماكن =================
  loadVenues(): void {
    this.venueService.getAll().subscribe({
      next: (res) => {
        this.venues = res;
      },
      error: () => console.error('فشل تحميل الأماكن'),
    });
  }

  // ================= حساب الإحصائيات =================
  calculateStatistics(): void {
    // فلترة حجوزات الشهر الحالي فقط
    const currentMonthBookings = this.allBookings.filter((booking) => {
      const bookingDate = new Date(booking.bookingDate);
      return (
        bookingDate.getMonth() === this.currentMonth &&
        bookingDate.getFullYear() === this.currentYear
      );
    });

    this.totalBookings = currentMonthBookings.length;
    this.confirmedBookings = currentMonthBookings.filter(
      (b) => b.bookingStatus === BookingStatus.Confirmed,
    ).length;
    this.pendingBookings = currentMonthBookings.filter(
      (b) => b.bookingStatus === BookingStatus.Pending,
    ).length;
    this.cancelledBookings = currentMonthBookings.filter(
      (b) => b.bookingStatus === BookingStatus.Cancelled,
    ).length;
    this.postponedBookings = currentMonthBookings.filter(
      (b) => b.bookingStatus === BookingStatus.Postponed,
    ).length;
    this.completedBookings = currentMonthBookings.filter(
      (b) => b.bookingStatus === BookingStatus.Complete,
    ).length;

    // حساب إجمالي الإيرادات للشهر الحالي
    this.totalRevenue = currentMonthBookings.reduce(
      (sum, b) => sum + (b.depositAmount || 0),
      0,
    );
  }
  // ================= توليد أيام الشهر =================
  generateCalendar(): void {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);

    const startDay = firstDay.getDay(); // يوم الأسبوع لأول يوم في الشهر (0 = الأحد)
    const daysCount = lastDay.getDate();

    // اسم الشهر
    const monthNames = [
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ];
    this.monthName = monthNames[this.currentMonth];

    this.daysInMonth = [];

    // أيام الشهر السابق (فارغة)
    for (let i = 0; i < startDay; i++) {
      this.daysInMonth.push({
        dayNumber: null,
        isCurrentMonth: false,
        isEmpty: true,
        date: null,
        bookings: [],
      });
    }

    // أيام الشهر الحالي
    for (let day = 1; day <= daysCount; day++) {
      const date = new Date(this.currentYear, this.currentMonth, day);
      const dateString = date.toISOString().split('T')[0];

      // فلترة الحجوزات لهذا اليوم
      const dayBookings = this.allBookings.filter((booking) => {
        const bookingDate = new Date(booking.bookingDate);
        return (
          bookingDate.getDate() === day &&
          bookingDate.getMonth() === this.currentMonth &&
          bookingDate.getFullYear() === this.currentYear
        );
      });

      // حساب إجمالي الإيرادات لهذا اليوم
      const dayRevenue = dayBookings.reduce(
        (sum, b) => sum + (b.depositAmount || 0),
        0,
      );

      const today = new Date();
      const isToday =
        day === today.getDate() &&
        this.currentMonth === today.getMonth() &&
        this.currentYear === today.getFullYear();

      this.daysInMonth.push({
        dayNumber: day,
        isCurrentMonth: true,
        isEmpty: false,
        isToday,
        isWeekend: date.getDay() === 5 || date.getDay() === 6, // الجمعة أو السبت
        date,
        dateString,
        bookings: dayBookings,
        totalBookings: dayBookings.length,
        totalRevenue: dayRevenue,
      });
    }

    // إكمال الأيام الفارغة لنهاية الشهر (لتكتمل 7 أعمدة)
    const totalDays = this.daysInMonth.length;
    const remainingDays = totalDays % 7;
    if (remainingDays !== 0) {
      for (let i = 0; i < 7 - remainingDays; i++) {
        this.daysInMonth.push({
          dayNumber: null,
          isCurrentMonth: false,
          isEmpty: true,
          date: null,
          bookings: [],
        });
      }
    }
  }

  // ================= التنقل بين الشهور =================
  previousMonth(): void {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
    this.calculateStatistics(); // <-- أضف هذا السطر
  }

  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
    this.calculateStatistics(); // <-- أضف هذا السطر
  }

  goToToday(): void {
    const today = new Date();
    this.currentMonth = today.getMonth();
    this.currentYear = today.getFullYear();
    this.generateCalendar();
    this.calculateStatistics(); // <-- أضف هذا السطر
  }
  // ================= عرض تفاصيل اليوم =================
  selectDay(day: any): void {
    if (day.isEmpty || !day.date) return;

    this.selectedDate = day.date;
    this.selectedDayBookings = day.bookings;
  }

  closeDayDetails(): void {
    this.selectedDate = null;
    this.selectedDayBookings = [];
  }

  // ================= دوال مساعدة (مثل اللي في bookings.component) =================
  getVenueName(venueId?: number): string {
    if (!venueId) return '-';
    const venue = this.venues.find(
      (v) => v.venueId === venueId || v.id === venueId,
    );
    return venue ? venue.venueName || venue.name || '-' : '-';
  }

  getBookingTypeText(type: BookingType): string {
    switch (type) {
      case BookingType.RamadanIftar:
        return 'إفطار رمضان';
      case BookingType.RamadanSuhoor:
        return 'سحور رمضان';
      case BookingType.Wedding:
        return 'زفاف';
      case BookingType.ShipTrip:
        return 'رحلة بحرية';
      case BookingType.Engagement:
        return 'خطوبة';
      case BookingType.Birthday:
        return 'عيد ميلاد';
      case BookingType.GardenParty:
        return 'حفلة حديقة';
      case BookingType.Conference:
        return 'مؤتمر';
      case BookingType.Other:
        return 'أخرى';
      default:
        return 'غير محدد';
    }
  }

  getStatusText(status: BookingStatus): string {
    switch (status) {
      case BookingStatus.Pending:
        return 'قيد الانتظار';
      case BookingStatus.Confirmed:
        return 'مؤكد';
      case BookingStatus.Cancelled:
        return 'ملغي';
      case BookingStatus.Postponed:
        return 'مؤجل';
      case BookingStatus.Complete:
        return 'مكتمل';
      default:
        return 'غير محدد';
    }
  }

  getStatusClass(status: BookingStatus): string {
    switch (status) {
      case BookingStatus.Pending:
        return 'pending';
      case BookingStatus.Confirmed:
        return 'confirmed';
      case BookingStatus.Cancelled:
        return 'cancelled';
      case BookingStatus.Postponed:
        return 'postponed';
      case BookingStatus.Complete:
        return 'completed';
      default:
        return '';
    }
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  }

  // ================= دوال التوجيه =================
  goToBookingDetails(bookingId?: number): void {
    if (bookingId) {
      // هنستخدم router لو عايزين ننقل للتفاصيل
      // this.router.navigate(['/bookings/details', bookingId]);
      console.log('go to booking details:', bookingId);
    }
  }

  createNewBooking(date?: Date): void {
    if (date) {
      // تنسيق التاريخ بشكل صحيح YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      // التوجيه إلى صفحة إنشاء حجز جديد مع تمرير التاريخ في queryParams
      this.router.navigate(['/bookings/new'], {
        queryParams: {
          date: formattedDate,
          source: 'calendar', // اختياري: عشان تعرف إنه جاي من التقويم
        },
      });

      this.toastr.info(`جاري إنشاء حجز جديد ليوم ${formattedDate}`);
    } else {
      // إذا مفيش تاريخ محدد، يروح صفحة إنشاء حجز جديد عادي
      this.router.navigate(['/bookings/new']);
    }
  }

  printDayBookings(date: Date): void {
    // تنسيق التاريخ
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    // فلترة حجوزات اليوم
    const dayBookings = this.allBookings.filter((booking) => {
      const bookingDate = new Date(booking.bookingDate);
      return (
        bookingDate.getDate() === date.getDate() &&
        bookingDate.getMonth() === date.getMonth() &&
        bookingDate.getFullYear() === date.getFullYear()
      );
    });

    if (dayBookings.length === 0) {
      this.toastr.warning('لا توجد حجوزات في هذا اليوم للطباعة');
      return;
    }

    // استخدام PrintService مع callback function
    const title = `حجوزات يوم ${formattedDate}`;
    const printContent = this.ReportprintService.generateStationContent(
      dayBookings,
      title,
      (venueId) => this.getVenueName(venueId), // ✅ تمرير دالة جلب اسم المكان
    );

    this.ReportprintService.openPrintWindow(printContent);
  }

  getTotalGuestsForSelectedDay(): number {
    return this.selectedDayBookings.reduce(
      (sum, booking) => sum + (booking.guestsCount || 0),
      0,
    );
  }

  getTotalRevenueForSelectedDay(): number {
    return this.selectedDayBookings.reduce(
      (sum, booking) => sum + (booking.depositAmount || 0),
      0,
    );
  }

  // ================= إحصائيات الأماكن لليوم المحدد =================
  getVenueBookingsCount(): {
    venueName: string;
    count: number;
    revenue: number;
  }[] {
    if (!this.selectedDayBookings.length) return [];

    const venueStats = new Map<
      number,
      { venueName: string; count: number; revenue: number }
    >();

    this.selectedDayBookings.forEach((booking) => {
      const venueId = booking.venueId;
      if (venueId) {
        const venueName = this.getVenueName(venueId);
        const current = venueStats.get(venueId) || {
          venueName,
          count: 0,
          revenue: 0,
        };
        current.count += 1;
        current.revenue += booking.depositAmount || 0;
        venueStats.set(venueId, current);
      }
    });

    // تحويل الماب إلى مصفوفة وترتيبها تنازلياً حسب عدد الحجوزات
    return Array.from(venueStats.values()).sort((a, b) => b.count - a.count);
  }

  getVenueBookingsCountText(): string {
    const stats = this.getVenueBookingsCount();
    if (stats.length === 0) return 'لا توجد حجوزات في الأماكن';

    return stats
      .map(
        (s) =>
          `${s.venueName}: ${s.count} حجز (${s.revenue.toLocaleString()} ج.م)`,
      )
      .join(' | ');
  }

  // هل يوجد أكثر من مكان في هذا اليوم؟
  hasMultipleVenues(): boolean {
    return this.getVenueBookingsCount().length > 1;
  }

  // إجمالي عدد الأماكن المحجوزة
  getTotalVenuesCount(): number {
    return this.getVenueBookingsCount().length;
  }
}
