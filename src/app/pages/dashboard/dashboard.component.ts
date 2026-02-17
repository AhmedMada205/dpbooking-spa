import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BookingService, BookingType, BookingStatus } from 'src/app/services/booking.service';
import { VenueService } from 'src/app/services/venue.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';
import { ReportprintService } from 'src/app/services/reportprint.service';
interface Booking {
  id: number;
  bookingType: number;
  placeType: number;
  bookingDate: Date;
  bookingTime?: string;
  numberOfGuests: number;
  customerName: string;
  phone1: string;
  phone2?: string;
  bookedByName?: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  notes?: string;
  bookingId?: number;
  clientName?: string;
  clientPhone?: string;
  guestsCount?: number;
  depositAmount?: number;
  venueId?: number;
  bookingStatus?: number;
}

interface TodayStats {
  totalBookings: number;
  revenue: number;
  activeBookings: number;
  pendingPayments: number;
  trend: number;
}


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  userName: string = 'أحمد محمد';
  firstName:string;

  userRole: string = 'مشرف';
  isAdmin: boolean = true;
  
  currentDate: Date = new Date();
  selectedDate: Date = new Date();
  
  sidebarCollapsed: boolean = false;
  showUserMenu: boolean = false;
  showNotifications: boolean = false;
  showToast: boolean = false;
  loading: boolean = false;
  
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'info' | 'warning' = 'success';
  toastIcon: string = '✅';
  
  todayStats: TodayStats = {
    totalBookings: 0,
    revenue: 0,
    activeBookings: 0,
    pendingPayments: 0,
    trend: 0
  };
    bookings: any[] = [];
  venues: any[] = [];
    currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;
   dateBicker: Date = new Date();

  constructor(
    private router: Router,
    private http: HttpClient,
    private bookingService: BookingService,
    private venueService: VenueService,
    private toastr: ToastrService,
     private auth: AuthService,
     private reportPrint: ReportprintService,
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.loadVenues();
    this.loadTodayBookings();
    
    setInterval(() => {
      this.currentDate = new Date();
    }, 60000);
  }

 

  loadUserData(): void {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.userName =user.firstName + ' ' + user.lastName || 'مستخدم';
        this.userRole = user.role || 'مستخدم';
        this.isAdmin = user.role === 'Admin';
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }

loadTodayBookings(): void {
  this.loading = true;

  const selected = this.selectedDate
    .toISOString()
    .split('T')[0];

  this.bookingService.getAllBookings().subscribe({
    next: (data) => {

      const filteredBookings = data.filter(booking => {
        const bookingDate = booking.bookingDate?.split('T')[0];
        return bookingDate === selected;
      });

      this.bookings = filteredBookings.map(b => ({
        ...b,
        bookingType: this.parseBookingType(b.bookingType),
        bookingStatus: this.parseBookingStatus(b.bookingStatus),
        id: b.bookingId,
        customerName: b.clientName,
        phone1: b.clientPhone,
        numberOfGuests: b.guestsCount,
        totalAmount: b.totalAmount,
        paidAmount: b.depositAmount || 0,
        remainingAmount: (b.totalAmount || 0) - (b.depositAmount || 0),
        status: this.getStatusTextFromNumber(
          this.parseBookingStatus(b.bookingStatus)
        )
      }));

      this.calculateTodayStats();
      this.totalPages = Math.ceil(this.bookings.length / this.itemsPerPage);
      this.loading = false;
    },
    error: () => {
      this.loading = false;
      this.toastr.error('حدث خطأ أثناء جلب الحجوزات');
    }
  });
}


getStatusIcon(status: BookingStatus): string {
  switch (status) {
    case BookingStatus.Pending: return '⏳';
    case BookingStatus.Confirmed: return '✅';
    case BookingStatus.Complete: return '🏁';
    case BookingStatus.Cancelled: return '❌';
    case BookingStatus.Postponed: return '📅';
    case BookingStatus.CancelledWithRefund: return '💸';
    default: return '❓';
  }
}
getBookingTypeIcon(type: number): string {
  switch (type) {
    case 5: return '🕌'; // RamadanIftar
    case 6: return '🌙'; // RamadanSuhoor
    default: return '📋';
  }
}

getPaymentMethodText(method: number): string {
  switch (method) {
    case 1: return 'نقدي';
    case 2: return 'بطاقة';
    case 3: return 'تحويل';
    default: return 'غير محدد';
  }
}


getTotalRevenue(): number {
  return this.bookings.reduce((total, booking) => total + (booking.totalAmount || 0), 0);
}

getTotalGuests(): number {
  return this.bookings.reduce((total, booking) => total + (booking.guestsCount || booking.numberOfGuests || 0), 0);
}

getAveragePerGuest(): number {
  const totalGuests = this.getTotalGuests();
  return totalGuests > 0 ? this.getTotalRevenue() / totalGuests : 0;
}

// دالة للتمييز البصري للحجوزات الخاصة
isBookingHighlighted(booking: any): boolean {
  // يمكنك تعديل شروط التمييز حسب احتياجاتك
  return booking.isVIP || booking.totalAmount > 1000 || booking.guestsCount > 10;
}



  private parseBookingType(type: any): number {
    if (typeof type === 'number') return type;
    if (typeof type === 'string') {
      const bookingType = BookingType[type as keyof typeof BookingType];
      return bookingType !== undefined ? bookingType : 0;
    }
    return 0;
  }

  private parseBookingStatus(status: any): number {
    if (typeof status === 'number') return status;
    if (typeof status === 'string') {
      const bookingStatus = BookingStatus[status as keyof typeof BookingStatus];
      return bookingStatus !== undefined ? bookingStatus : 0;
    }
    return 0;
  }

  calculateTodayStats(): void {
    this.todayStats = {
      totalBookings: this.bookings.length,
      revenue: this.bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
      activeBookings: this.bookings.filter(b => 
        b.bookingStatus === BookingStatus.Confirmed || b.bookingStatus === 1
      ).length,
      pendingPayments: this.bookings.filter(b => {
        const remaining = (b.totalAmount || 0) - (b.depositAmount || 0);
        return remaining > 0;
      }).length,
      trend: 12
    };
  }

  loadVenues(): void {
    this.venueService.getAll().subscribe({
      next: (res) => {
        this.venues = res;
      },
      error: (err) => console.error('فشل تحميل الأماكن:', err)
    });
  }

  getVenueName(venueId?: number): string {
    if (!venueId) return '-';
    const venue = this.venues.find(v => v.venueId === venueId || v.id === venueId);
    return venue ? venue.venueName || venue.name || '-' : '-';
  }

  getBookingTypeText(type: number): string {
    switch(type) {
      case BookingType.RamadanIftar: return 'إفطار رمضان';
      case BookingType.RamadanSuhoor: return 'سحور رمضان';
      case BookingType.Wedding: return 'زفاف';
      case BookingType.ShipTrip: return 'رحلة بحرية';
      case BookingType.Engagement: return 'خطوبة';
      case BookingType.Birthday: return 'عيد ميلاد';
      case BookingType.GardenParty: return 'حفلة حديقة';
      case BookingType.Conference: return 'مؤتمر';
      case BookingType.Other: return 'أخرى';
      default: return 'غير محدد';
    }
  }

  getBookingTypeClass(type: number): string {
    switch(type) {
      case BookingType.RamadanIftar: return 'badge-iftar';
      case BookingType.RamadanSuhoor: return 'badge-suhur';
      default: return 'badge-secondary';
    }
  }

  getStatusTextFromNumber(status: number): string {
    switch(status) {
      case BookingStatus.Pending: return 'قيد الانتظار';
      case BookingStatus.Confirmed: return 'مؤكد';
      case BookingStatus.Cancelled: return 'ملغي';
      case BookingStatus.Postponed: return 'مؤجل';
      default: return 'غير محدد';
    }
  }

  getStatusText(status: any): string {
    if (typeof status === 'string') {
      const statuses: { [key: string]: string } = {
        'Confirmed': 'مؤكد',
        'Pending': 'قيد الانتظار',
        'Cancelled': 'ملغى',
        'Completed': 'مكتمل',
        'Waiting': 'في الانتظار'
      };
      return statuses[status] || status;
    } else {
      return this.getStatusTextFromNumber(status);
    }
  }

  getStatusClass(status: any): string {
    if (typeof status === 'string') {
      const classes: { [key: string]: string } = {
        'Confirmed': 'confirmed',
        'Pending': 'pending',
        'Cancelled': 'cancelled',
        'Postponed': 'Postponed',
        'Waiting': 'waiting'
      };
      return classes[status] || '';
    } else {
      switch(status) {
        case BookingStatus.Pending: return 'pending';
        case BookingStatus.Confirmed: return 'confirmed';
        case BookingStatus.Cancelled: return 'cancelled';
        case BookingStatus.Postponed: return 'Postponed';
        default: return '';
      }
    }
  }

  getArabicDay(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      return days[date.getDay()];
    } catch {
      return '';
    }
  }



showDatePicker: boolean = false;

toggleDatePicker(): void {
  this.showDatePicker = !this.showDatePicker;
}

onDateChange(date: Date): void {
  if (!date) return;

  // لازم نعمل نسخة جديدة
  this.selectedDate = new Date(date);

  this.showDatePicker = false; // لو بتستخدمه
  this.loadTodayBookings();
}

  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  }

  isToday(date: Date | string): boolean {
    try {
      const bookingDate = new Date(date);
      const today = new Date();
      return bookingDate.getDate() === today.getDate() &&
             bookingDate.getMonth() === today.getMonth() &&
             bookingDate.getFullYear() === today.getFullYear();
    } catch {
      return false;
    }
  }

  // ===================== ACTION METHODS =====================
  createBooking(): void {
    this.router.navigate(['/bookings/new']);
  }

 
  editBooking(booking: any): void {
    if (booking.bookingId) {
      this.router.navigate(['bookings/edit/', booking.bookingId]);
    }
  }

printCustomerReceipt(booking: Booking): void {
  // نافذة الطباعة
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (!printWindow) {
    this.toastr.error('يرجى السماح بالنوافذ المنبثقة لطباعة الفاتورة');
    return;
  }
  
  // توليد محتوى الفاتورة
  const receiptContent = this.generateCustomerReceipt(booking);
  
  // كتابة المحتوى
  printWindow.document.open();
  printWindow.document.write(receiptContent);
  printWindow.document.close();
  
  // رسالة نجاح
  this.toastr.success(`تم إنشاء فاتورة للعميل ${booking.clientName}`);
}



  generateCustomerReceipt(booking: any): string {
    const bookingDate = new Date(booking.bookingDate);
    const formattedDate = bookingDate.toLocaleDateString('ar-EG');
    const time = this.formatTime(booking.bookingTime);

    const meals = booking.meals || [];
    let mealsTotal = 0;
    let mealsRows = '';

    if (meals.length > 0) {
      mealsTotal = meals.reduce((sum: number, meal: any) => {
        const price =
          meal.specialPrice != null ? meal.specialPrice : meal.unitPrice;
        return sum + (meal.quantity || 0) * (price || 0);
      }, 0);

      mealsRows = meals
        .map((meal: any, index: number) => {
          const price =
            meal.specialPrice != null ? meal.specialPrice : meal.unitPrice;
          const mealTotal = (meal.quantity || 0) * (price || 0);
          return `
        <tr>
          <td style="padding: 6px; text-align: center;">${index + 1}</td>
          <td style="padding: 6px;">${meal.mealName || 'غير محدد'}</td>
          <td style="padding: 6px; text-align: center;">${meal.quantity || 0}</td>
          <td style="padding: 6px; text-align: center;">${(price || 0).toLocaleString('ar-EG')}</td>
          <td style="padding: 6px; text-align: center;">${mealTotal.toLocaleString('ar-EG')}</td>
        </tr>
      `;
        })
        .join('');
    }

    const serviceCharge = mealsTotal * 0.12;
    const venuePrice =
      booking.venuePrice && booking.venuePrice > 0 ? booking.venuePrice : 0;
    const finalTotal = mealsTotal + serviceCharge + venuePrice;
    const remaining = Math.max(0, finalTotal - (booking.depositAmount || 0));

    const currentDate = new Date().toLocaleDateString('ar-EG');
    const currentTime = new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const venueRow =
      venuePrice > 0
        ? `
    <div class="payment-row">
      <span class="payment-label">سعر القاعة:</span>
      <span class="payment-value">${venuePrice.toLocaleString('ar-EG')} ج.م</span>
    </div>
  `
        : '';
    const notesSection =
      booking.note && booking.note.trim() !== ''
        ? `
  <div class="section">
    <div class="section-title">ملاحظات</div>
    <div class="notes-box">${booking.note}</div>
  </div>
`
        : '';

    return `
<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="UTF-8">
<title>فاتورة العميل - ${booking.clientName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Tajawal', 'Segoe UI', sans-serif; }
  body { background: linear-gradient(135deg, #28225c 0%, #faaf3a 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
  @media print { @page { size: A4 portrait; margin: 0mm; } body { background: white !important; padding: 0; min-height: auto; margin: 0; } .receipt-container { box-shadow: none !important; margin: 0 !important; width: 210mm !important; min-height: 297mm !important; border-radius: 0 !important; } .no-print, .print-btn { display: none !important; } }
  .receipt-container { width: 210mm; min-height: 297mm; background: white; border-radius: 8px; overflow: hidden; position: relative; box-shadow: 0 10px 40px rgba(0,0,0,0.3); margin: 0 auto; }
  .header { background: linear-gradient(135deg, #28225c 0%, #1a1740 100%); color: white; padding: 15px 20px; position: relative; overflow: hidden; min-height: 110px; }
  .header::before { content: ''; position: absolute; top: -30px; right: -20px; width: 100px; height: 100px; background: linear-gradient(135deg, #faaf3a 0%, rgba(250,175,58,0.2) 100%); border-radius: 50%; opacity: 0.3; }
  .restaurant-name { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 3px; position: relative; z-index: 2; color: #faaf3a; text-align: center; }
  .receipt-title { font-size: 16px; color: rgba(255,255,255,0.9); margin-bottom: 8px; font-weight: 400; position: relative; z-index: 2; text-align: center; }
  .booking-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding: 10px 15px; background: rgba(250,175,58,0.15); border-radius: 8px; font-size: 13px; border: 1px solid rgba(250,175,58,0.3); position: relative; z-index: 2; }
  .booking-id { background: #faaf3a; color: #28225c; padding: 5px 15px; border-radius: 15px; font-weight: 700; font-size: 14px; box-shadow: 0 3px 8px rgba(250,175,58,0.4); }
  .booking-date { display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.9); font-size: 13px; }
  .content { padding: 15px 20px; }
  .section { margin-bottom: 15px; padding: 15px; border: 1px solid #e8eaf6; border-radius: 8px; background: white; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
  .section-title { font-size: 15px; color: #28225c; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e8eaf6; font-weight: 700; display: flex; align-items: center; gap: 8px; font-size: 14px; }
  .section-title::before { content: ''; width: 4px; height: 18px; background: linear-gradient(135deg, #28225c, #faaf3a); border-radius: 2px; }
  .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 15px; }
  .info-row { display: flex; justify-content: space-between; align-items: center; min-height: 24px; padding: 4px 0; position: relative; }
  .info-row::after { content: ''; position: absolute; bottom: 0; right: 0; width: 100%; height: 1px; background: linear-gradient(90deg, transparent, #f0f0f0, transparent); }
  .info-label { color: #666; font-weight: 500; font-size: 12.5px; }
  .info-value { color: #28225c; font-weight: 600; font-size: 13px; text-align: left; }
  .meals-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  .meals-table thead { background: linear-gradient(135deg, #28225c 0%, #1a1740 100%); }
  .meals-table th { color: white; padding: 10px 6px; text-align: center; font-weight: 500; font-size: 12.5px; border: 1px solid rgba(255,255,255,0.1); }
  .meals-table td { padding: 10px 6px; border: 1px solid #f0f0f0; text-align: center; vertical-align: middle; font-size: 12px; }
  .meals-table tbody tr:nth-child(even) { background: #fafafa; }
  .payment-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 15px; margin-top: 5px; }
  .payment-row { display: flex; justify-content: space-between; align-items: center; min-height: 26px; padding: 6px 10px; border-radius: 6px; background: #f9f9f9; border: 1px solid #e8e8e8; font-size: 13px; }
  .payment-label { color: #555; font-weight: 500; font-size: 12.5px; }
  .payment-value { color: #28225c; font-weight: 700; font-size: 13px; }
  .payment-total { background: linear-gradient(135deg, #28225c 0%, #1a1740 100%); border: none; color: white; grid-column: span 2; margin-top: 5px; padding: 8px 10px; }
  .payment-total .payment-label, .payment-total .payment-value { color: white; font-size: 13.5px; }
  .payment-paid { background: #f0f9f0; border-color: #c0e0c0; }
  .payment-paid .payment-value { color: #2e7d32; }
  .payment-remaining { background: #fff0f0; border-color: #ffc0c0; }
  .payment-remaining .payment-value { color: #c62828; }
  .alert-box { background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%); padding: 12px; border-radius: 8px; border-right: 3px solid #faaf3a; margin: 15px 0; font-size: 12px; line-height: 1.5; color: #5d4037; position: relative; }
  .notes-box { background: #f5f5ff; padding: 12px; border-radius: 8px; margin-top: 6px; font-size: 12.5px; line-height: 1.5; color: #28225c; border: 1px solid #d8d8ff; }
  .footer { text-align: center; margin-top: 20px; padding-top: 15px; position: relative; color: #666; }
  .footer::before { content: ''; position: absolute; top: 0; right: 50%; transform: translateX(50%); width: 120px; height: 2px; background: linear-gradient(90deg, #28225c, #faaf3a, #28225c); border-radius: 1px; }
  .footer p { font-size: 12.5px; margin-bottom: 5px; }
  .footer strong { color: #28225c; }
  .footer-info { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding: 12px 15px; background: #f9f9f9; border-radius: 8px; font-size: 11.5px; color: #666; border: 1px solid #e8e8e8; }
  .footer-contact { display: flex; align-items: center; gap: 8px; }
  .footer-contact span { display: flex; align-items: center; gap: 5px; padding: 4px 8px; background: white; border-radius: 12px; border: 1px solid #e8e8e8; }
  .controls { text-align: center; margin: 20px auto; padding: 15px; background: #f9f9f9; border-radius: 8px; border: 1px solid #e8e8e8; }
  .print-btn { background: linear-gradient(135deg, #28225c 0%, #1a1740 100%); color: white; border: none; padding: 12px 30px; font-size: 13px; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(40,34,92,0.3); display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 auto; }
  .print-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(40,34,92,0.4); }
  .print-btn::before { content: '🖨️'; font-size: 14px; }
  .no-data { text-align: center; padding: 20px; color: #999; font-style: italic; font-size: 12.5px; background: #fafafa; border-radius: 6px; border: 1px dashed #e0e0e0; }
</style>
</head>
<body>

<div class="receipt-container">
  
  <div class="header">
    <div class="restaurant-name">Fleet Club</div>
    <div class="receipt-title">إيصال حجز</div>
    <div class="booking-meta">
      <div class="booking-id">#${booking.bookingId || '000'}</div>
      <div class="booking-date">
        <span>${currentDate}</span> • <span>${currentTime}</span>
      </div>
    </div>
  </div>

  <div class="content">
    
    <div class="alert-box">
      <strong>ملاحظة:</strong>  يرجى مراجعة بيانات الحجز والرد بالتأكيد خلال ربع ساعةوفي حالة عد الرد يعتر الببانات مؤكدة.
    </div>

    <div class="section">
      <div class="section-title">معلومات العميل</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-label">اسم العميل:</span><span class="info-value">${booking.clientName || '---'}</span></div>
        <div class="info-row"><span class="info-label">الهاتف:</span><span class="info-value">${booking.clientPhone || '---'}</span></div>
        <div class="info-row"><span class="info-label">عدد الضيوف:</span><span class="info-value">${booking.guestsCount || 0} شخص</span></div>
        <div class="info-row"><span class="info-label">رقم الإيصال:</span><span class="info-value">${booking.receiptNumber || '---'}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">تفاصيل الحجز</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-label">التاريخ:</span><span class="info-value">${formattedDate}</span></div>
        <div class="info-row"><span class="info-label">الوقت:</span><span class="info-value" style="color: #faaf3a; font-weight: 700;">${time}</span></div>
        <div class="info-row"><span class="info-label">المكان:</span><span class="info-value">${this.getVenueName(booking.venueId)}</span></div>
        <div class="info-row"><span class="info-label">نوع الحجز:</span><span class="info-value">${this.getBookingTypeText(booking.bookingType)}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">الوجبات المطلوبة</div>
      <table class="meals-table">
        <thead>
          <tr>
            <th>#</th><th>اسم الوجبة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${mealsRows || `<tr><td colspan="5" class="no-data">لا توجد وجبات مضافة</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">المدفوعات</div>
      <div class="payment-grid">
        <div class="payment-row"><span class="payment-label">إجمالي الوجبات:</span><span class="payment-value">${mealsTotal.toLocaleString('ar-EG')} ج.م</span></div>
        ${venueRow}
        <div class="payment-row payment-total"><span class="payment-label">الإجمالي النهائي:</span><span class="payment-value">${finalTotal.toLocaleString('ar-EG')} ج.م</span></div>
        <div class="payment-row payment-paid"><span class="payment-label">المبلغ المدفوع:</span><span class="payment-value">${(booking.depositAmount || 0).toLocaleString('ar-EG')} ج.م</span></div>
        <div class="payment-row payment-remaining"><span class="payment-label">المبلغ المتبقي:</span><span class="payment-value">${remaining.toLocaleString('ar-EG')} ج.م</span></div>
      </div>
    </div>

   ${notesSection}

    <div class="footer">
      <p>© devpioneerجميع الحقوق محفوظة</p>
      <div class="footer-info">
        <div class="footer-contact">
          <span>📞 01092209699</span>
        </div>
        <div class="footer-contact">
          <span>🖥 www.fleetclub.com</span>
        </div>
      </div>
    </div>

    <div class="controls no-print">
      <button class="print-btn" onclick="window.print()">طباعة الفاتورة</button>
    </div>

  </div>
</div>

</body>
</html>
  `;
  }



confirmBooking(booking: any): void {
  Swal.fire({
    title: `تأكيد حجز ${booking.clientName || booking.customerName}`,
    text: 'هل أنت متأكد من تأكيد الحجز؟',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'نعم، أكد الحجز',
    cancelButtonText: 'إلغاء'
  }).then(result => {
    if (result.isConfirmed) {
      this.bookingService.updateBookingStatus(booking.bookingId!, 'Confirmed')
        .subscribe({
          next: () => {
            Swal.fire('تم التأكيد!', 'تم تأكيد الحجز بنجاح', 'success');
            this.loadTodayBookings();
          },
          error: (err) => {
            console.error(err);
            Swal.fire('خطأ', err?.error?.message || 'فشل في تأكيد الحجز', 'error');
          }
        });
    }
  });
}

cancelBooking(booking: any): void {
  Swal.fire({
    title: `إلغاء حجز ${booking.clientName || booking.customerName}`,
    text: 'هل أنت متأكد من إلغاء الحجز؟',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'نعم، إلغاء الحجز',
    cancelButtonText: 'تراجع'
  }).then(result => {
    if (result.isConfirmed) {
      this.bookingService.updateBookingStatus(booking.bookingId!, 'Cancelled')
        .subscribe({
          next: () => {
            Swal.fire('تم الإلغاء!', 'تم إلغاء الحجز بنجاح', 'success');
            this.loadTodayBookings();
          },
          error: (err) => {
            console.error(err);
            Swal.fire('خطأ', err?.error?.message || 'فشل في إلغاء الحجز', 'error');
          }
        });
    }
  });
}

postponeBooking(booking: Booking): void {
  Swal.fire({
    title: `تأجيل حجز ${booking.clientName}`,
    text: 'أدخل التاريخ الجديد للحجز:',
    input: 'date', // نوع الإدخال date بدل prompt
    inputLabel: 'التاريخ الجديد',
    showCancelButton: true,
    confirmButtonText: 'تأكيد',
    cancelButtonText: 'إلغاء',
    inputAttributes: {
      min: new Date().toISOString().split('T')[0] // لا يمكن اختيار تاريخ قديم
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      const newDate = result.value; // YYYY-MM-DD
      this.bookingService.updateBookingStatus(booking.bookingId!, 'Postponed', newDate)
        .subscribe({
          next: () => {
            Swal.fire('تم التأجيل!', `تم تأجيل الحجز إلى ${newDate}`, 'success');
            this.loadTodayBookings(); // لتحديث القائمة بعد التعديل
          },
          error: (err) => {
            console.error(err);
            Swal.fire('خطأ', err?.error?.message || 'فشل في تأجيل الحجز', 'error');
          }
        });
    }
  });
}

  // ===================== TABLE PAGINATION =====================
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // ===================== DATE NAVIGATION =====================
previousDay(): void {
  const newDate = new Date(this.selectedDate);
  newDate.setDate(newDate.getDate() - 1);
  this.selectedDate = newDate;
  this.loadTodayBookings();
}


nextDay(): void {
  const newDate = new Date(this.selectedDate);
  newDate.setDate(newDate.getDate() + 1);
  this.selectedDate = newDate;
  this.loadTodayBookings();
}
  openDatePicker(): void {
    this.showInfo('سيتم فتح منتقي التاريخ في الإصدار القادم');
  }

  // ===================== QUICK ACTIONS =====================
refreshBookings(): void {
  this.selectedDate = new Date();
  this.loadTodayBookings();
  this.showSuccess('تم تحديث البيانات والعودة لليوم الحالي');
}

  // printTodayBookings(): void {
  //   this.printDailyReport();
  // }

 

  // ===================== USER ACTIONS =====================
  viewProfile(): void {
    this.router.navigate(['/profile']);
  }

  changePassword(): void {
    this.router.navigate(['/change-password']);
  }

  logout(): void {
     this.auth.logout();
    localStorage.removeItem('currentUser');
    localStorage.removeItem('dpbooking_token');
    localStorage.removeItem('dpbooking_user');
    this.router.navigate(['/login']);
    this.showSuccess('تم تسجيل الخروج بنجاح');
  }



  // ===================== PRINT METHODS =====================
  
  // طباعة تقرير محطات التوزيع فقط - الديزين الوحيد المتبقي
  printStationReport(bookingType: number, typeName: string): void {
    const today = new Date().toISOString().split('T')[0];
    const filteredBookings = this.bookings.filter(booking => {
      const bookingDate = booking.bookingDate?.split('T')[0];
      return bookingDate === today && booking.bookingType === bookingType;
    });
    
    if (filteredBookings.length === 0) {
      this.showError(`لا توجد حجوزات ${typeName} لهذا اليوم`);
      return;
    }
    
    this.showInfo(`جاري طباعة تقرير ${typeName} لمحطات التوزيع...`);
    
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    
    if (!printWindow) {
      this.showError('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير');
      return;
    }
    
    const stationContent = this.generateStationContent(filteredBookings, typeName);
    
    printWindow.document.open();
    printWindow.document.write(stationContent);
    printWindow.document.close();
  }

  // توليد محتوى محطات التوزيع بدون إحصائيات


private generateStationContent(bookings: any[], title: string): string {

  const TAX_RATE = environment.TAX_RATE; // ✅ نسبة الضريبة
  const currentDate = new Date().toLocaleDateString('ar-EG');

  // ================= تجميع الحجوزات حسب المكان =================
  const bookingsByVenue = bookings
    .filter(b =>
      b.bookingStatus !== 3 && // Cancelled
      b.bookingStatus !== 4 && // Postponed
      b.bookingStatus !== 5    // CancelledWithRefund
    )
    .reduce((acc: any, booking: any) => {
      const venueId = booking.venueId;
      if (!acc[venueId]) acc[venueId] = [];
      acc[venueId].push(booking);
      return acc;
    }, {});

  let venuesHtml = '';

  // ================= تقرير كل مكان =================
  Object.keys(bookingsByVenue).forEach((venueId, venueIndex) => {

    const venueBookings = bookingsByVenue[venueId];
    if (!venueBookings.length) return;

    const venueName = this.getVenueName(+venueId);

    // عدد الحجوزات
    const bookingsCount = venueBookings.length;

    // مجموع الضيوف
    const totalGuests = venueBookings.reduce((sum: number, b: any) =>
      sum + (b.guestsCount || b.numberOfGuests || 0), 0
    );

    // ترتيب الحجوزات
    const sortedBookings = [...venueBookings].sort((a, b) =>
      new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime()
    );

    let bookingCards = '';

    // ================= نفس كروت الحجوزات =================
    sortedBookings.forEach((booking, index) => {

      const bookingDate = new Date(booking.bookingDate);
      const formattedDate = bookingDate.toLocaleDateString('ar-EG');
      const time = this.formatTime(booking.bookingTime);

      let mealsTotal = 0;
      let mealsTable = '';

      if (booking.meals && booking.meals.length > 0) {
        mealsTotal = booking.meals.reduce((sum: number, meal: any) =>
          sum + ((meal.quantity || 0) * (meal.unitPrice || 0)), 0
        );

        mealsTable = '<table class="meals-table">';
        booking.meals.forEach((meal: any) => {
          mealsTable += `
            <tr>
              <td class="meal-name">${meal.mealName || 'غير محدد'}</td>
              <td class="meal-qty">×${meal.quantity || 0}</td>
            </tr>
          `;
        });
        mealsTable += '</table>';
      } else {
        mealsTable = '<span class="no-meals">لا توجد وجبات</span>';
        mealsTotal = booking.totalAmount || 0;
      }

      const taxAmount = mealsTotal * TAX_RATE;
      const totalWithTax = mealsTotal + taxAmount;
      const paid = booking.depositAmount || booking.paidAmount || 0;

      bookingCards += `
        <div class="station-card">
          <div class="card-header">
            <div class="card-number">#${index + 1}</div>
            <div class="card-receipt">رقم الإيصال: ${booking.receiptNumber || '---'}</div>
            <div class="card-time">${time} | ${formattedDate}</div>
          </div>

          <div class="card-body">

            <div class="info-row">
              <div class="info-field">
                <span class="field-name">العميل:</span>
                <span class="field-value">${booking.clientName || booking.customerName || 'غير محدد'}</span>
              </div>
              <div class="info-field">
                <span class="field-name">الهاتف:</span>
                <span class="field-value">${booking.clientPhone || booking.phone1 || ''}</span>
              </div>
            </div>

            <div class="info-row">
              <div class="info-field">
                <span class="field-name">عدد الضيوف:</span>
                <span class="field-value">${booking.guestsCount || booking.numberOfGuests || 0}</span>
              </div>
              <div class="info-field meals-section">
                <span class="field-name">الوجبات:</span>
                <div class="meals-list">${mealsTable}</div>
              </div>
            </div>

            <div class="payment-row">
              <div class="payment-item">
                <span class="payment-label">المدفوع:</span>
                <span class="payment-value paid">${paid.toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>

          </div>

          <div class="card-separator"></div>
        </div>
      `;
    });

    // ================= صفحة المكان =================
    venuesHtml += `
      <div class="venue-page">
        <div class="header">
          <h1>${title}</h1>
          <div class="subtitle">
            المكان: <strong>${venueName}</strong> |
            عدد الحجوزات: <strong>${bookingsCount}</strong> |
            إجمالي الضيوف: <strong>${totalGuests}</strong>
          </div>
        </div>

        ${bookingCards}
      </div>
    `;
  });

  // ================= الصفحة النهائية =================
  return `
<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="UTF-8">
<title>${title}</title>

 <style>
         * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, sans-serif;
          }
          
          body {
            padding: 5mm;
            background: white;
            color: #333;
            font-size: 11px;
            line-height: 1.2;
          }
          
          /* إعدادات الطباعة */
          @media print {
            @page {
              size: A4;
              margin: 5mm;
            }
            
            body {
              padding: 2mm;
            }
            
            .no-print {
              display: none;
            }
            
            .station-card {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
          
          /* ترويسة مضغوطة */
          .header {
            text-align: center;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 2px solid #2c3e50;
          }
          
          .header h1 {
            font-size: 16px;
            color: #2c3e50;
            margin: 2px 0;
          }
          
          .header .subtitle {
            font-size: 10px;
            color: #666;
          }
          
          /* بطاقة حجز مدمجة */
          .station-card {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 6px;
            padding: 4px;
          }
          
          .card-header {
            background: #e3f2fd;
            padding: 4px 6px;
            border-radius: 3px;
            margin-bottom: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
          }
          
          .card-number {
            font-weight: bold;
            color: #2c3e50;
            font-size: 11px;
          }
          
          .card-id, .card-time {
            color: #555;
          }
          
          .card-body {
            padding: 2px 4px;
          }
          
          .info-row {
            display: flex;
            margin-bottom: 3px;
            gap: 8px;
          }
          
          .info-field {
            flex: 1;
            display: flex;
            align-items: center;
            min-height: 20px;
          }
          
          .field-name {
            color: #666;
            font-weight: bold;
            font-size: 10px;
            min-width: 50px;
            margin-left: 4px;
          }
          
          .field-value {
            color: #2c3e50;
            font-size: 11px;
            font-weight: 500;
          }
          
          /* جدول الوجبات مضغوط */
          .meals-section {
            flex: 2;
          }
          
          .meals-list {
            flex: 1;
          }
          
          .meals-table {
            display: inline-table;
            border-collapse: collapse;
            margin-right: 4px;
          }
          
          .meals-table tr {
            display: inline-block;
            margin-left: 6px;
            margin-bottom: 2px;
          }
          
          .meal-name {
            background: #f8f9fa;
            padding: 2px 4px;
            border-radius: 2px;
            font-size: 10px;
            border: 1px solid #dee2e6;
          }
          
          .meal-qty {
            background: #e8f5e8;
            padding: 2px 4px;
            border-radius: 2px;
            margin-right: 2px;
            font-size: 10px;
            border: 1px solid #d4edda;
          }
          
          .no-meals {
            color: #95a5a6;
            font-style: italic;
            font-size: 10px;
          }
          
          /* قسم المدفوعات مضغوط */
          .payment-row {
            display: flex;
            justify-content: space-between;
            margin-top: 4px;
            padding: 4px 0;
            border-top: 1px solid #eee;
          }
          
          .payment-item {
            text-align: center;
            flex: 1;
          }
          
          .payment-label {
            display: block;
            color: #666;
            font-size: 9px;
            margin-bottom: 1px;
          }
          
          .payment-value {
            display: block;
            color: #2c3e50;
            font-weight: bold;
            font-size: 11px;
          }
          
          .payment-value.paid {
            color: #27ae60;
          }
          
          .payment-value.remaining {
            color: #e74c3c;
          }
          
          /* الملاحظات */
          .notes-row {
            margin-top: 4px;
            padding: 3px 4px;
            background: #fff9e6;
            border-radius: 2px;
            border-right: 2px solid #f39c12;
            font-size: 10px;
          }
          
          .notes-label {
            font-weight: bold;
            color: #666;
            margin-left: 4px;
          }
          
          .notes-text {
            color: #333;
          }
          
          /* فاصل */
          .card-separator {
            height: 1px;
            background: #eee;
            margin: 2px 0;
          }
          
          /* الفوتر */
          .footer {
            text-align: center;
            margin-top: 8px;
            padding-top: 4px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 9px;
          }
          
          /* أزرار التحكم */
          .controls {
            text-align: center;
            margin: 8px 0;
            padding: 6px;
          }
          
          .print-btn {
            background: #27ae60;
            color: white;
            border: none;
            padding: 6px 15px;
            font-size: 11px;
            border-radius: 3px;
            cursor: pointer;
          }
.venue-page {
  page-break-before: always;
}
.venue-page:first-child {
  page-break-before: auto;
}

</style>
</head>

<body>

${venuesHtml}

<script>
window.onload = function () {
  setTimeout(() => window.print(), 300);
};
</script>

</body>
</html>
`;
}



/////////////////////التقرير اليومي////////////

// طباعة تقرير اليوم الكامل مع الإحصائيات
printFullDayReport(): void {
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = this.bookings.filter(booking => {
    const bookingDate = booking.bookingDate?.split('T')[0];
    return bookingDate === today;
  });
  
  if (todayBookings.length === 0) {
    this.showError('لا توجد حجوزات لهذا اليوم');
    return;
  }
  
  this.showInfo('جاري طباعة تقرير اليوم الكامل...');
  
  // تصفية الحجوزات النشطة فقط للإحصائيات
  const activeBookings = todayBookings.filter(b => 
    b.bookingStatus !== 3 && // Cancelled
    b.bookingStatus !== 4    // Postponed
  );
  
  // حساب الإحصائيات من الحجوزات النشطة فقط
  const iftarCount = activeBookings.filter(b => b.bookingType === 5).length;
  const suhurCount = activeBookings.filter(b => b.bookingType === 6).length;
  const totalGuests = activeBookings.reduce((sum, b) => sum + (b.guestsCount || 0), 0);
  const totalAmount = activeBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalPaid = activeBookings.reduce((sum, b) => sum + (b.depositAmount || 0), 0);
  const totalRemaining = totalAmount - totalPaid;
  
  // إنشاء محتوى التقرير
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  
  if (!printWindow) {
    this.showError('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير');
    return;
  }
   const todayArabic = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  // تمرير جميع الحجوزات للعرض، ولكن الإحصائيات من النشطة فقط
  const reportContent = this.generateFullDayReportContent(
    todayBookings,
    `تقرير اليوم الكامل - ${todayArabic}`,
    iftarCount, 
    suhurCount, 
    totalGuests, 
    totalAmount, 
    totalPaid, 
    totalRemaining
  );
  
  printWindow.document.open();
  printWindow.document.write(reportContent);
  printWindow.document.close();
}
// توليد محتوى تقرير اليوم الكامل مع الإحصائيات
private generateFullDayReportContent(
  bookings: any[],
  title: string,
  iftarCount: number,
  suhurCount: number,
  totalGuests: number,
  totalAmount: number,
  totalPaid: number,
  totalRemaining: number
): string {
  
  // تصفية الحجوزات النشطة فقط للإحصائيات
  const activeBookings = bookings.filter(booking => 
    booking.bookingStatus !== 3 && // Cancelled
    booking.bookingStatus !== 4    // Postponed
  );
  
  // للحصول على جميع الحجوزات للعرض
  const sortedAllBookings = [...bookings].sort((a, b) => {
    return new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime();
  });

  const currentDate = new Date().toLocaleDateString('ar-EG');

  // تجميع الحجوزات حسب المكان (الحجوزات النشطة فقط للإحصائيات)
  const venueStats: { [venueName: string]: number } = {};
  activeBookings.forEach(booking => {
    const venueName = this.getVenueName(booking.venueId) || 'غير محدد';
    if (venueStats[venueName]) {
      venueStats[venueName]++;
    } else {
      venueStats[venueName] = 1;
    }
  });

  // بناء HTML لإحصائيات الأماكن
  let venueStatsHtml = '';
  for (const [venue, count] of Object.entries(venueStats)) {
    if (count > 0) { // فقط الأماكن التي لديها حجوزات
      venueStatsHtml += `
        <div class="stat-detail">
          <div class="stat-detail-label">${venue}</div>
          <div class="stat-detail-value">${count} حجز</div>
        </div>
      `;
    }
  }

  // حساب إجمالي سعر القاعات (الحجوزات النشطة فقط)
  let totalVenuePrice = 0;

  // بناء بطاقات الحجوزات (جميع الحجوزات للعرض)
  let bookingCards = '';
  sortedAllBookings.forEach((booking, index) => {
    const bookingDate = new Date(booking.bookingDate);
    const formattedDate = bookingDate.toLocaleDateString('ar-EG');
    const time = this.formatTime(booking.bookingTime);
    const bookingTypeText = this.getBookingTypeText(booking.bookingType);
    
    // تحديد إذا كانت الحجوزة ملغية أو مؤجلة
    const isCancelledOrPostponed = booking.bookingStatus === 3 || booking.bookingStatus === 4;

    // حساب إجمالي الوجبات (لا تحسب للملغية/المؤجلة)
    let mealsTotal = 0;
    let mealsTable = '';

    if (!isCancelledOrPostponed && booking.meals && booking.meals.length > 0) {
      mealsTotal = booking.meals.reduce((sum: number, meal: any) => {
        return sum + ((meal.quantity || 0) * (meal.unitPrice || 0));
      }, 0);

      mealsTable = '<table class="meals-table">';
      booking.meals.forEach((meal: any) => {
        mealsTable += `
          <tr>
            <td class="meal-name">${meal.mealName || 'غير محدد'}</td>
            <td class="meal-qty">×${meal.quantity || 0}</td>
          </tr>
        `;
      });
      mealsTable += '</table>';
    } else if (!isCancelledOrPostponed) {
      mealsTable = '<span class="no-meals">لا توجد وجبات</span>';
      mealsTotal = booking.totalAmount || 0;
    } else {
      mealsTable = '<span class="no-meals" style="color: #999; font-style: italic;">(ملغية/مؤجلة)</span>';
    }

    // حساب سعر القاعة إذا كان موجوداً (الحجوزات النشطة فقط)
    const venuePrice = booking.venuePrice || 0;
    if (venuePrice > 0 && !isCancelledOrPostponed) {
      totalVenuePrice += venuePrice;
    }

    // بناء HTML لسعر القاعة إذا كان موجوداً
    const venuePriceItem = (venuePrice > 0 && !isCancelledOrPostponed) ? `
      <div class="payment-item">
        <span class="payment-label">سعر القاعة:</span>
        <span class="payment-value">${venuePrice.toLocaleString('ar-EG')} ج.م</span>
      </div>
    ` : '';

    // بناء قسم المدفوعات (يظهر فقط للحجوزات النشطة)
    const paymentSection = !isCancelledOrPostponed ? `
      <div class="payment-row">
        <div class="payment-item">
          <span class="payment-label">إجمالي الوجبات:</span>
          <span class="payment-value">${mealsTotal.toLocaleString('ar-EG')} ج.م</span>
        </div>
        ${venuePriceItem}
        <div class="payment-item">
          <span class="payment-label">الإجمالي:</span>
          <span class="payment-value">${booking.totalAmount.toLocaleString('ar-EG')} ج.م</span>
        </div>
        <div class="payment-item">
          <span class="payment-label">المدفوع:</span>
          <span class="payment-value paid">${(booking.depositAmount || booking.paidAmount || 0).toLocaleString('ar-EG')} ج.م</span>
        </div>
        <div class="payment-item">
          <span class="payment-label">المتبقي:</span>
          <span class="payment-value remaining">${(booking.totalAmount - (booking.depositAmount || booking.paidAmount || 0)).toLocaleString('ar-EG')} ج.م</span>
        </div>
      </div>
    ` : `
      <div class="payment-row" style="background: #f8f9fa; color: #999; font-style: italic; padding: 10px; border-radius: 4px;">
        هذه الحجوزة ${booking.bookingStatus === 3 ? 'ملغية' : 'مؤجلة'} - غير مدرجة في الإحصائيات المالية
      </div>
    `;

    bookingCards += `
      <div class="station-card" style="${isCancelledOrPostponed ? 'background: #f9f9f9; opacity: 0.8; border: 1px dashed #ccc;' : ''}">
        <div class="card-header" style="${isCancelledOrPostponed ? 'background: #f0f0f0; color: #666;' : ''}">
          <div class="card-number">#${index + 1}</div>
          <div class="card-id">رقم: ${booking.bookingId || 'غير محدد'}</div>
          <div class="card-type">${bookingTypeText}</div>
          <div class="card-receipt">رقم الإيصال: ${booking.receiptNumber || '---'}</div>
          <div class="card-time">${time} | ${formattedDate}</div>
        </div>
        
        <div class="card-body">
          <div class="info-row">
            <div class="info-field">
              <span class="field-name">العميل:</span>
              <span class="field-value">${booking.clientName || booking.customerName || 'غير محدد'}</span>
            </div>
            <div class="info-field">
              <span class="field-name">الهاتف:</span>
              <span class="field-value">${booking.clientPhone || booking.phone1 || ''}</span>
            </div>
            <div class="info-field">
              <span class="field-name">المكان:</span>
              <span class="field-value">${this.getVenueName(booking.venueId)}</span>
            </div>
          </div>
          
          <div class="info-row">
            <div class="info-field">
              <span class="field-name">عدد الضيوف:</span>
              <span class="field-value">${booking.guestsCount || booking.numberOfGuests || 0}</span>
            </div>
            <div class="info-field meals-section">
              <span class="field-name">الوجبات:</span>
              <div class="meals-list">${mealsTable}</div>
            </div>
          </div>
          
          ${paymentSection}
          
          ${booking.note || booking.notes ? `
          <div class="notes-row">
            <span class="notes-label">ملاحظات:</span>
            <span class="notes-text">${booking.note || booking.notes || ''}</span>
          </div>
          ` : ''}
          
          <div class="booking-status">
            <span class="status-label">الحالة:</span>
            <span class="status-value ${this.getStatusClass(booking.bookingStatus)}">${this.getStatusText(booking.bookingStatus)}</span>
          </div>
        </div>
        
        <div class="card-separator"></div>
      </div>
    `;
  });

  // إضافة إحصائية إجمالي سعر القاعات
  const venuePriceStat = totalVenuePrice > 0 ? `
    <div class="stat-detail">
      <div class="stat-detail-label">إجمالي القاعات</div>
      <div class="stat-detail-value">${totalVenuePrice.toLocaleString('ar-EG')} ج.م</div>
    </div>
  ` : '';

  // بناء التقرير النهائي
  return `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        /* إعدادات عامة مضغوطة */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Segoe UI', Tahoma, sans-serif;
        }
        
        body {
          padding: 5mm;
          background: white;
          color: #333;
          font-size: 11px;
          line-height: 1.2;
        }
        
        /* إعدادات الطباعة */
        @media print {
          @page {
            size: A4;
            margin: 5mm;
          }
          
          body {
            padding: 2mm;
          }
          
          .no-print {
            display: none;
          }
          
          .station-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
        
        /* ترويسة مضغوطة */
        .header {
          text-align: center;
          margin-bottom: 8px;
          padding-bottom: 4px;
          border-bottom: 2px solid #2c3e50;
        }
        
        .header h1 {
          font-size: 16px;
          color: #2c3e50;
          margin: 2px 0;
        }
        
        .header .subtitle {
          font-size: 10px;
          color: #666;
        }
        
        /* إحصائيات اليوم */
        .day-stats {
          background: linear-gradient(to right, #2c3e50, #3498db);
          color: white;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 12px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          text-align: center;
        }
        
        .stat-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 5px;
        }
        
        .stat-box .stat-title {
          font-size: 9px;
          opacity: 0.9;
          margin-bottom: 2px;
        }
        
        .stat-box .stat-value {
          font-size: 14px;
          font-weight: bold;
        }
        
        .iftar-stats {
          background: #27ae60;
          border-radius: 4px;
          padding: 3px 8px;
        }
        
        .suhur-stats {
          background: #3498db;
          border-radius: 4px;
          padding: 3px 8px;
        }
        
        /* تفاصيل الإحصائيات */
        .stats-details {
          background: #f8f9fa;
          padding: 8px;
          border-radius: 4px;
          margin-bottom: 10px;
          border: 1px solid #dee2e6;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          text-align: center;
        }
        
        .stat-detail {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .stat-detail-label {
          font-size: 9px;
          color: #666;
          margin-bottom: 2px;
        }
        
        .stat-detail-value {
          font-size: 12px;
          font-weight: bold;
          color: #2c3e50;
        }
        
        /* بطاقة حجز مدمجة */
        .station-card {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-bottom: 6px;
          padding: 4px;
        }
        
        .card-header {
          background: #e3f2fd;
          padding: 4px 6px;
          border-radius: 3px;
          margin-bottom: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
        }
        
        .card-number {
          font-weight: bold;
          color: #2c3e50;
          font-size: 11px;
        }
        
        .card-id, .card-time, .card-type {
          color: #555;
        }
        
        .card-type {
          background: #f39c12;
          color: white;
          padding: 1px 4px;
          border-radius: 2px;
          font-size: 9px;
        }
        
        .card-body {
          padding: 2px 4px;
        }
        
        .info-row {
          display: flex;
          margin-bottom: 3px;
          gap: 8px;
        }
        
        .info-field {
          flex: 1;
          display: flex;
          align-items: center;
          min-height: 20px;
        }
        
        .field-name {
          color: #666;
          font-weight: bold;
          font-size: 10px;
          min-width: 50px;
          margin-left: 4px;
        }
        
        .field-value {
          color: #2c3e50;
          font-size: 11px;
          font-weight: 500;
        }
        
        /* جدول الوجبات مضغوط */
        .meals-section {
          flex: 2;
        }
        
        .meals-list {
          flex: 1;
        }
        
        .meals-table {
          display: inline-table;
          border-collapse: collapse;
          margin-right: 4px;
        }
        
        .meals-table tr {
          display: inline-block;
          margin-left: 6px;
          margin-bottom: 2px;
        }
        
        .meal-name {
          background: #f8f9fa;
          padding: 2px 4px;
          border-radius: 2px;
          font-size: 10px;
          border: 1px solid #dee2e6;
        }
        
        .meal-qty {
          background: #e8f5e8;
          padding: 2px 4px;
          border-radius: 2px;
          margin-right: 2px;
          font-size: 10px;
          border: 1px solid #d4edda;
        }
        
        .no-meals {
          color: #95a5a6;
          font-style: italic;
          font-size: 10px;
        }
        
        /* قسم المدفوعات مضغوط */
        .payment-row {
          display: flex;
          justify-content: space-between;
          margin-top: 4px;
          padding: 4px 0;
          border-top: 1px solid #eee;
        }
        
        .payment-item {
          text-align: center;
          flex: 1;
        }
        
        .payment-label {
          display: block;
          color: #666;
          font-size: 9px;
          margin-bottom: 1px;
        }
        
        .payment-value {
          display: block;
          color: #2c3e50;
          font-weight: bold;
          font-size: 11px;
        }
        
        .payment-value.paid {
          color: #27ae60;
        }
        
        .payment-value.remaining {
          color: #e74c3c;
        }
        
        /* الملاحظات */
        .notes-row {
          margin-top: 4px;
          padding: 3px 4px;
          background: #fff9e6;
          border-radius: 2px;
          border-right: 2px solid #f39c12;
          font-size: 10px;
        }
        
        .notes-label {
          font-weight: bold;
          color: #666;
          margin-left: 4px;
        }
        
        .notes-text {
          color: #333;
        }
        
        /* حالة الحجز */
        .booking-status {
          margin-top: 4px;
          padding: 2px 4px;
          background: #f8f9fa;
          border-radius: 2px;
          display: inline-flex;
          align-items: center;
        }
        
        .status-label {
          font-weight: bold;
          color: #666;
          margin-left: 4px;
          font-size: 10px;
        }
        
        .status-value {
          font-size: 10px;
          padding: 1px 4px;
          border-radius: 2px;
          font-weight: bold;
        }
        
        .status-value.confirmed {
          background: #d4edda;
          color: #155724;
        }
        
        .status-value.pending {
          background: #fff3cd;
          color: #856404;
        }
        
        .status-value.cancelled {
          background: #f8d7da;
          color: #721c24;
        }
        
        .status-value.postponed {
          background: #e3f2fd;
          color: #0d47a1;
        }
        
        .status-value.completed {
          background: #cce5ff;
          color: #004085;
        }
        
        /* فاصل */
        .card-separator {
          height: 1px;
          background: #eee;
          margin: 2px 0;
        }
        
        /* الفوتر */
        .footer {
          text-align: center;
          margin-top: 8px;
          padding-top: 4px;
          border-top: 1px solid #ddd;
          color: #666;
          font-size: 9px;
        }
        
        /* أزرار التحكم */
        .controls {
          text-align: center;
          margin: 8px 0;
          padding: 6px;
        }
        
        .print-btn {
          background: #27ae60;
          color: white;
          border: none;
          padding: 6px 15px;
          font-size: 11px;
          border-radius: 3px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <div class="subtitle">تقرير اليوم الكامل - ${currentDate}</div>
        <div class="subtitle" style="color: #666; margin-top: 5px; font-size: 9px;">
          ملاحظة: الإحصائيات أدناه تشمل الحجوزات النشطة فقط (غير الملغية/المؤجلة)
        </div>
      </div>
      
      <!-- إحصائيات اليوم (الحجوزات النشطة فقط) -->
      <div class="day-stats">
        <div class="stat-box">
          <div class="stat-title">الحجوزات النشطة</div>
          <div class="stat-value">${activeBookings.length}</div>
        </div>
        <div class="stat-box">
          <div class="stat-title">إفطار رمضان</div>
          <div class="stat-value iftar-stats">${iftarCount}</div>
        </div>
        <div class="stat-box">
          <div class="stat-title">سحور رمضان</div>
          <div class="stat-value suhur-stats">${suhurCount}</div>
        </div>
      </div>
      
      <!-- تفاصيل الإحصائيات (الحجوزات النشطة فقط) -->
      <div class="stats-details">
        <div class="stat-detail">
          <div class="stat-detail-label">إجمالي الضيوف</div>
          <div class="stat-detail-value">${totalGuests}</div>
        </div>
        <div class="stat-detail">
          <div class="stat-detail-label">الإجمالي المالي</div>
          <div class="stat-detail-value">${totalAmount.toLocaleString('ar-EG')} ج.م</div>
        </div>
        ${venuePriceStat}
        <div class="stat-detail">
          <div class="stat-detail-label">المدفوع</div>
          <div class="stat-detail-value">${totalPaid.toLocaleString('ar-EG')} ج.م</div>
        </div>
        <div class="stat-detail">
          <div class="stat-detail-label">المتبقي</div>
          <div class="stat-detail-value">${totalRemaining.toLocaleString('ar-EG')} ج.م</div>
        </div>

        <!-- إحصائيات الأماكن -->
        ${venueStatsHtml}
      </div>
      
      ${bookingCards}
      
      <div class="controls no-print">
        <button class="print-btn" onclick="window.print()">🖨️ طباعة التقرير</button>
      </div>
      
      <div class="footer">
        <p>تقرير اليوم الكامل - نظام إدارة الحجوزات dpBooking</p>
        <p>الإحصائيات للحجوزات النشطة فقط - جميع الحجوزات مدرجة للعرض</p>
        <p>تم الإنشاء في: ${currentDate}</p>
      </div>
      
      <script>
        window.onload = function() {
          setTimeout(() => window.print(), 300);
        };
      </script>
    </body>
    </html>
  `;
}

activeMenuBooking: any = null;
menuPosition = { top: 0, left: 0 };

  // ===================== UI METHODS =====================
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
openMenu(booking: any, event: MouseEvent) {
  event.stopPropagation(); // منع click من الانتشار

  // تفعيل القائمة للعنصر الحالي فقط
  this.activeMenuBooking = booking;

  // حساب موقع الزر على الشاشة
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  this.menuPosition.top = rect.bottom + window.scrollY; // تحت الزر
  this.menuPosition.left = rect.left + window.scrollX;   // بمحاذاة الزر
}
print() {
  if (!this.activeMenuBooking) {
    return;
  }

  this.reportPrint.printCustomerReceipt(
    this.activeMenuBooking.bookingId
  );
}
// لإغلاق القائمة عند الضغط في أي مكان
@HostListener('document:click')
closeMenu() {
  this.activeMenuBooking = null;
}
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  navigateTo(route: string): void {
    if (route === 'dashboard') {
      return;
    }
    this.router.navigate([`/${route}`]);
  }

  // ===================== TOAST METHODS =====================
  showSuccess(message: string): void {
    this.toastMessage = message;
    this.toastType = 'success';
    this.toastIcon = '✅';
    this.showToast = true;
    this.hideToastAfterDelay();
  }

  showError(message: string): void {
    this.toastMessage = message;
    this.toastType = 'error';
    this.toastIcon = '❌';
    this.showToast = true;
    this.hideToastAfterDelay();
  }

  showInfo(message: string): void {
    this.toastMessage = message;
    this.toastType = 'info';
    this.toastIcon = 'ℹ️';
    this.showToast = true;
    this.hideToastAfterDelay();
  }

  hideToast(): void {
    this.showToast = false;
  }

  private hideToastAfterDelay(): void {
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }
}