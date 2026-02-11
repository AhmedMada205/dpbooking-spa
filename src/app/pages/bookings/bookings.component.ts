import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  BookingService,
  Booking,
  BookingType,
  BookingStatus,
} from 'src/app/services/booking.service';
import { ToastrService } from 'ngx-toastr';
import { VenueService } from 'src/app/services/venue.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-bookings',
  templateUrl: './bookings.component.html',
  styleUrls: ['./bookings.component.scss'],
})
export class BookingsComponent implements OnInit {
  bookings: Booking[] = [];
  filteredBookings: Booking[] = [];
  loading = false;
  allBookings: Booking[] = [];
  // Statistics
  totalBookings = 0;
  confirmedBookings = 0;
  pendingBookings = 0;
  cancelledBookings = 0;
  postponedBookings = 0;
  completedBookings = 0;

  BookingStatus = BookingStatus;
  // Filters - أسماء المتغيرات كما في الـ HTML
  searchTerm = '';
  statusFilter: string | '' = ''; // سلسلة نصية لأن الـ HTML يرسل قيمة string
  dateOnly: string; // سلسلة نصية لأن الـ HTML يرسل قيمة string
  typeFilter: string | '' = ''; // سلسلة نصية لأن الـ HTML يرسل قيمة string
  venueFilter: string | '' = ''; // أضف هذا المتغير ✅

  dateFrom = '';
  dateTo = '';
  venues: any[] = [];
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  pages: number[] = [];
  statsCards: any[] = [];
  // Venues mapping

  constructor(
    private bookingService: BookingService,
    private router: Router,
    private venueService: VenueService,
    private toastr: ToastrService,
  ) {}

  // printIftarToday(): void {
  //   const today = new Date().toISOString().split('T')[0];
  //   this.router.navigate(['/bookings/print'], {
  //     queryParams: { type: 'iftar', date: today },
  //   });
  // }

  printSuhurToday(): void {
    const today = new Date().toISOString().split('T')[0];
    this.router.navigate(['/bookings/print'], {
      queryParams: { type: 'suhur', date: today },
    });
  }

  printAllToday(): void {
    const today = new Date().toISOString().split('T')[0];
    this.router.navigate(['/bookings/print'], {
      queryParams: { date: today },
    });
  }

  openPrintDialog(): void {
    this.router.navigate(['/bookings/print']);
  }
  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
  // ================= COUNT FUNCTIONS =================
  getTodayBookingsCount(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.bookings.filter(
      (booking) => booking.bookingDate.split('T')[0] === today,
    ).length;
  }

  getIftarCount(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.bookings.filter(
      (booking) =>
        booking.bookingDate.split('T')[0] === today &&
        booking.bookingType === BookingType.RamadanIftar,
    ).length;
  }

  getSuhurCount(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.bookings.filter(
      (booking) =>
        booking.bookingDate.split('T')[0] === today &&
        booking.bookingType === BookingType.RamadanSuhoor,
    ).length;
  }

  ngOnInit(): void {
    this.fetchBookings();
    this.loadVenues();
  }
  fetchBookings(): void {
    this.loading = true;
    this.bookingService.getAllBookings().subscribe({
      next: (data) => {
        // تحويل bookingType و bookingStatus من string إلى number
        this.bookings = data.map((b) => ({
          ...b,
          bookingType:
            BookingType[b.bookingType as unknown as keyof typeof BookingType],
          bookingStatus:
            BookingStatus[
              b.bookingStatus as unknown as keyof typeof BookingStatus
            ],
        }));

        this.allBookings = [...this.bookings]; // أضف هذا السطر
        this.filteredBookings = [...this.bookings];
        this.calculateStatistics();
        this.updatePagination();
        this.loading = false;
        this.toastr.success('تم تحميل الحجوزات بنجاح');
        console.log(this.bookings);
      },
      error: (err) => {
        console.error('Error fetching bookings:', err);
        this.toastr.error('حدث خطأ أثناء جلب الحجوزات');
        this.loading = false;
      },
    });
  }
  parseDateOnly(dateStr: string | Date): Date {
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  getBookingsByType(typeId: number) {
    return this.bookings.filter((b) => b.bookingType === typeId);
  }

  printStationBookings(bookingType: number): void {
    const filteredBookings = this.allBookings.filter(
      (booking) => booking.bookingType === bookingType,
    );

    if (filteredBookings.length === 0) {
      this.showAlert('لا توجد حجوزات من هذا النوع', 'warning');
      return;
    }

    const typeName = this.getBookingTypeText(bookingType);
    const printWindow = window.open('', '_blank', 'width=900,height=700');

    if (!printWindow) {
      this.showAlert('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير', 'error');
      return;
    }

    const stationContent = this.generateStationContent(
      filteredBookings,
      typeName,
    );
    printWindow.document.open();
    printWindow.document.write(stationContent);
    printWindow.document.close();
  }

  /**
   * توليد محتوى طباعة لمحطات التوزيع
   */
  generateStationContent(bookings: any[], title: string): string {
    // ترتيب الحجوزات حسب التاريخ
    const sortedBookings = [...bookings].sort((a, b) => {
      return (
        new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime()
      );
    });

    // التاريخ الحالي
    const currentDate = new Date().toLocaleDateString('ar-EG');

    // إنشاء محتوى كل حجز - نسخة مدمجة
    let bookingCards = '';
    sortedBookings.forEach((booking, index) => {
      const bookingDate = new Date(booking.bookingDate);
      const formattedDate = bookingDate.toLocaleDateString('ar-EG');
      const dayName = this.getArabicDay(booking.bookingDate);
      const time = this.formatTime(booking.bookingTime);

      // حساب إجمالي الوجبات
      let mealsTotal = 0;
      let mealsTable = '';

      if (booking.meals && booking.meals.length > 0) {
        mealsTotal = booking.meals.reduce((sum: number, meal: any) => {
          return sum + (meal.quantity || 0) * (meal.unitPrice || 0);
        }, 0);

        // جدول مدمج
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
      }

      bookingCards += `
      <div class="station-card">
        <div class="card-header">
          <div class="card-number">#${index + 1}</div>
          <div class="card-id">رقم: ${booking.bookingId || 'غير محدد'}</div>
           <div class="card-receipt">رقم الإيصال: ${booking.receiptNumber || '---'}</div>
          <div class="card-time">${time} | ${formattedDate}</div>
        </div>
        
        <div class="card-body">
          <div class="info-row">
            <div class="info-field">
              <span class="field-name">العميل:</span>
              <span class="field-value">${booking.clientName || 'غير محدد'}</span>
            </div>
            <div class="info-field">
              <span class="field-name">الهاتف:</span>
              <span class="field-value">${booking.clientPhone || ''}</span>
            </div>
            <div class="info-field">
              <span class="field-name">المكان:</span>
              <span class="field-value">${this.getVenueName(booking.venueId)}</span>
            </div>
          </div>
          
          <div class="info-row">
            <div class="info-field">
              <span class="field-name">عدد الضيوف:</span>
              <span class="field-value">${booking.guestsCount || 0}</span>
            </div>
            <div class="info-field meals-section">
              <span class="field-name">الوجبات:</span>
              <div class="meals-list">${mealsTable}</div>
            </div>
          </div>
          
          <div class="payment-row">
            <div class="payment-item">
              <span class="payment-label">الإجمالي:</span>
              <span class="payment-value">${mealsTotal.toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div class="payment-item">
              <span class="payment-label">المدفوع:</span>
              <span class="payment-value paid">${(booking.depositAmount || 0).toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div class="payment-item">
              <span class="payment-label">المتبقي:</span>
              <span class="payment-value remaining">${(mealsTotal - (booking.depositAmount || 0)).toLocaleString('ar-EG')} ج.م</span>
            </div>
          </div>
          
          ${
            booking.note
              ? `
          <div class="notes-row">
            <span class="notes-label">ملاحظات:</span>
            <span class="notes-text">${booking.note}</span>
          </div>
          `
              : ''
          }
        </div>
        
        <div class="card-separator"></div>
      </div>
    `;
    });

    return `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${title} - محطات التوزيع</title>
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
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <div class="subtitle">تقرير محطات التوزيع - ${currentDate}</div>
      </div>
      
      ${bookingCards}
      
      <div class="controls no-print">
        <button class="print-btn" onclick="window.print()">🖨️ طباعة التقرير</button>
      </div>
      
      <div class="footer">
        <p>نموذج توزيع على محطات التوزيع - نظام إدارة الحجوزات</p>
      </div>
      
      <script>
        window.onload = function() {
          // الطباعة التلقائية
          setTimeout(() => window.print(), 300);
        };
      </script>
    </body>
    </html>
  `;
  }

  // 3. دالة لطباعة نموذج مبسط (يشبه الصورة)
  printSimpleReportByType(bookingType: number): void {
    // فلترة الحجوزات حسب النوع
    const filteredBookings = this.allBookings.filter(
      (booking) => booking.bookingType === bookingType,
    );

    if (filteredBookings.length === 0) {
      this.showAlert('لا توجد حجوزات من هذا النوع', 'warning');
      return;
    }

    // تحديد اسم النوع للعرض
    const typeName = this.getBookingTypeText(bookingType);

    // إنشاء نافذة طباعة مبسطة
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (!printWindow) {
      this.showAlert('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير', 'error');
      return;
    }

    // إنشاء محتوى مبسط يشبه الصورة
    let simpleContent = this.generateEnhancedPrintContent(
      filteredBookings,
      typeName,
    );

    printWindow.document.open();
    printWindow.document.write(simpleContent);
    printWindow.document.close();
  }

  generateEnhancedPrintContent(bookings: any[], title: string): string {
    // ترتيب الحجوزات حسب التاريخ
    const sortedBookings = [...bookings].sort((a, b) => {
      return (
        new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime()
      );
    });

    // التاريخ الحالي
    const currentDate = new Date().toLocaleDateString('ar-EG');

    // إجمالي عدد الضيوف والمبالغ
    const totalGuests = sortedBookings.reduce(
      (sum, booking) => sum + (booking.guestsCount || 0),
      0,
    );
    const totalAmount = sortedBookings.reduce(
      (sum, booking) => sum + (booking.totalAmount || 0),
      0,
    );

    // إنشاء محتوى كل حجز
    let bookingCards = '';
    sortedBookings.forEach((booking, index) => {
      const bookingDate = new Date(booking.bookingDate);
      const formattedDate = bookingDate.toLocaleDateString('ar-EG');
      const dayName = this.getArabicDay(booking.bookingDate);
      const time = this.formatTime(booking.bookingTime);

      // إنشاء جدول الوجبات
      let mealsTable = '';
      let mealsTotal = 0;

      if (booking.meals && booking.meals.length > 0) {
        mealsTable = `
        <table class="meals-table">
          <tr class="meals-header">
            <th>#</th>
            <th>اسم الوجبة</th>
            <th>الكمية</th>
            <th>السعر</th>
            <th>الإجمالي</th>
          </tr>
      `;

        booking.meals.forEach((meal: any, mealIndex: number) => {
          const mealTotal = (meal.quantity || 0) * (meal.unitPrice || 0);
          mealsTotal += mealTotal;

          mealsTable += `
          <tr>
            <td>${mealIndex + 1}</td>
            <td>${meal.mealName || 'غير محدد'}</td>
            <td>${meal.quantity || 0}</td>
            <td>${(meal.unitPrice || 0).toLocaleString('ar-EG')} ج.م</td>
            <td>${mealTotal.toLocaleString('ar-EG')} ج.م</td>
          </tr>
        `;
        });

        mealsTable += `
          <tr class="meals-total">
            <td colspan="4"><strong>إجمالي الوجبات:</strong></td>
            <td><strong>${mealsTotal.toLocaleString('ar-EG')} ج.م</strong></td>
          </tr>
        </table>
      `;
      } else {
        mealsTable = '<p class="no-meals">لا توجد وجبات مضافة</p>';
      }

      bookingCards += `
      <div class="booking-card">
        <!-- رأس الحجز -->
        <div class="booking-header">
          <div class="booking-number">الحجز #${index + 1}</div>
          <div class="booking-id">رقم الحجز: ${booking.bookingId || 'غير محدد'}</div>
          <div class="booking-status ${this.getStatusClass(booking.bookingStatus)}">
            ${this.getStatusText(booking.bookingStatus)}
          </div>
        </div>
        
        <!-- معلومات العميل -->
        <div class="section">
          <h3 class="section-title">معلومات العميل</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">الاسم:</span>
              <span class="value">${booking.clientName || 'غير محدد'}</span>
            </div>
            <div class="info-item">
              <span class="label">الهاتف:</span>
              <span class="value">${booking.clientPhone || ''}</span>
            </div>
            <div class="info-item">
              <span class="label">عدد الضيوف:</span>
              <span class="value">${booking.guestsCount || 0} شخص</span>
            </div>
            <div class="info-item">
              <span class="label">رقم الإيصال:</span>
              <span class="value">${booking.receiptNumber || 'غير محدد'}</span>
            </div>
          </div>
        </div>
        
        <!-- معلومات الحجز -->
        <div class="section">
          <h3 class="section-title">معلومات الحجز</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">التاريخ:</span>
              <span class="value">${formattedDate} (${dayName})</span>
            </div>
            <div class="info-item">
              <span class="label">الوقت:</span>
              <span class="value">${time}</span>
            </div>
            <div class="info-item">
              <span class="label">المكان:</span>
              <span class="value">${this.getVenueName(booking.venueId)}</span>
            </div>
            <div class="info-item">
              <span class="label">نوع الحجز:</span>
              <span class="value">${this.getBookingTypeText(booking.bookingType)}</span>
            </div>
          </div>
        </div>
        
        <!-- الوجبات -->
        <div class="section">
          <h3 class="section-title">الوجبات المطلوبة</h3>
          ${mealsTable}
        </div>
        
        <!-- المدفوعات -->
        <div class="section">
          <h3 class="section-title">المدفوعات</h3>
          <div class="payment-grid">
            <div class="payment-item">
              <span class="label">إجمالي الوجبات:</span>
              <span class="value">${mealsTotal.toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div class="payment-item">
              <span class="label">المبلغ المدفوع:</span>
              <span class="value">${(booking.depositAmount || 0).toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div class="payment-item highlight">
              <span class="label">المبلغ المتبقي:</span>
              <span class="value">${(mealsTotal - (booking.depositAmount || 0)).toLocaleString('ar-EG')} ج.م</span>
            </div>
          </div>
        </div>
        
        <!-- الملاحظات -->
        ${
          booking.note
            ? `
        <div class="section">
          <h3 class="section-title">ملاحظات</h3>
          <div class="notes-content">
            ${booking.note}
          </div>
        </div>
        `
            : ''
        }
        
        <!-- الفاصل -->
        <div class="separator"></div>
      </div>
    `;
    });

    return `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * {
          box-sizing: border-box;
          font-family: 'Arial', sans-serif;
        }
        
        body {
          margin: 0;
          padding: 20px;
          background: #f8f9fa;
          color: #333;
          font-size: 14px;
        }
        
        @media print {
          body {
            padding: 10px;
            background: white;
          }
          
          .no-print {
            display: none !important;
          }
          
          .booking-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
        
        @page {
          size: A4;
          margin: 15mm;
        }
        
        /* الترويسة */
        .header {
          background: linear-gradient(135deg, #2c3e50, #4a6491);
          color: white;
          padding: 25px;
          border-radius: 10px;
          margin-bottom: 25px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 32px;
          font-weight: bold;
        }
        
        .header h2 {
          margin: 0 0 20px 0;
          font-size: 20px;
          font-weight: normal;
          opacity: 0.9;
        }
        
        .header-info {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 15px;
          margin-top: 20px;
        }
        
        .info-badge {
          background: rgba(255,255,255,0.15);
          padding: 8px 20px;
          border-radius: 20px;
          font-size: 14px;
          border: 1px solid rgba(255,255,255,0.2);
        }
        
        /* كارت الحجز */
        .booking-card {
          background: white;
          border-radius: 12px;
          margin-bottom: 25px;
          overflow: hidden;
          box-shadow: 0 3px 15px rgba(0,0,0,0.08);
          border: 1px solid #e0e0e0;
          transition: transform 0.2s;
        }
        
        .booking-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(0,0,0,0.12);
        }
        
        /* رأس الحجز */
        .booking-header {
          background: linear-gradient(135deg, #3498db, #2980b9);
          color: white;
          padding: 15px 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #2980b9;
        }
        
        .booking-number {
          font-size: 20px;
          font-weight: bold;
        }
        
        .booking-id {
          font-size: 16px;
          background: rgba(255,255,255,0.2);
          padding: 5px 15px;
          border-radius: 20px;
        }
        
        .booking-status {
          padding: 6px 20px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: bold;
        }
        
        /* الأقسام */
        .section {
          padding: 20px 25px;
          border-bottom: 1px solid #eee;
        }
        
        .section:last-child {
          border-bottom: none;
        }
        
        .section-title {
          margin: 0 0 15px 0;
          color: #2c3e50;
          font-size: 18px;
          padding-bottom: 8px;
          border-bottom: 2px solid #f0f0f0;
        }
        
        /* الشبكات */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
        }
        
        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px dashed #eee;
        }
        
        .info-item:last-child {
          border-bottom: none;
        }
        
        .label {
          color: #666;
          font-weight: bold;
          min-width: 120px;
        }
        
        .value {
          color: #2c3e50;
          font-weight: 500;
        }
        
        /* جدول الوجبات */
        .meals-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        
        .meals-table th {
          background: #f8f9fa;
          padding: 12px;
          text-align: center;
          border: 1px solid #dee2e6;
          color: #2c3e50;
          font-weight: bold;
        }
        
        .meals-table td {
          padding: 10px;
          text-align: center;
          border: 1px solid #dee2e6;
        }
        
        .meals-table tr:nth-child(even) {
          background: #f8f9fa;
        }
        
        .meals-header {
          background: #e3f2fd !important;
        }
        
        .meals-total {
          background: #e8f5e8 !important;
          font-weight: bold;
        }
        
        .meals-total td {
          color: #27ae60;
          font-size: 16px;
        }
        
        .no-meals {
          text-align: center;
          padding: 20px;
          color: #95a5a6;
          font-style: italic;
          background: #f8f9fa;
          border-radius: 6px;
        }
        
        /* المدفوعات */
        .payment-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 10px;
        }
        
        .payment-item {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #3498db;
        }
        
        .payment-item.highlight {
          background: #e8f5e8;
          border-left-color: #27ae60;
        }
        
        /* الملاحظات */
        .notes-content {
          background: #fff9e6;
          padding: 15px;
          border-radius: 8px;
          border-right: 4px solid #f39c12;
          line-height: 1.6;
        }
        
        /* الفاصل */
        .separator {
          height: 1px;
          background: linear-gradient(to right, transparent, #3498db, transparent);
          margin: 0 25px;
        }
        
        /* الملخص */
        .summary {
          background: white;
          padding: 25px;
          border-radius: 12px;
          margin-top: 25px;
          box-shadow: 0 3px 15px rgba(0,0,0,0.08);
          border-top: 4px solid #2c3e50;
        }
        
        .summary h3 {
          margin: 0 0 20px 0;
          color: #2c3e50;
          font-size: 22px;
          text-align: center;
        }
        
        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }
        
        .stat-card {
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          padding: 20px;
          border-radius: 10px;
          text-align: center;
          border: 1px solid #dee2e6;
        }
        
        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #2c3e50;
          margin: 10px 0;
        }
        
        .stat-label {
          color: #666;
          font-size: 14px;
        }
        
        /* الأزرار */
        .controls {
          text-align: center;
          margin: 30px 0;
          padding: 25px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 3px 15px rgba(0,0,0,0.08);
        }
        
        .btn {
          background: linear-gradient(135deg, #3498db, #2980b9);
          color: white;
          border: none;
          padding: 12px 35px;
          font-size: 16px;
          border-radius: 8px;
          cursor: pointer;
          margin: 0 10px;
          transition: all 0.3s;
          font-weight: bold;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(52, 152, 219, 0.3);
        }
        
        .btn-close {
          background: linear-gradient(135deg, #e74c3c, #c0392b);
        }
        
        .btn-close:hover {
          box-shadow: 0 5px 15px rgba(231, 76, 60, 0.3);
        }
        
        /* الفوتر */
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #eee;
          color: #7f8c8d;
          font-size: 13px;
        }
        
        /* كلاسات الحالة */
        .badge-pending { background: #f39c12; color: white; }
        .badge-confirmed { background: #27ae60; color: white; }
        .badge-cancelled { background: #e74c3c; color: white; }
        .badge-completed { background: #3498db; color: white; }
      </style>
    </head>
    <body>
      <!-- الترويسة -->
      <div class="header">
        <h1>${title}</h1>
        <h2>تقرير حجوزات المطعم - نظام التوزيع الداخلي</h2>
        <div class="header-info">
          <div class="info-badge">📅 تاريخ الطباعة: ${currentDate}</div>
          <div class="info-badge">📋 عدد الحجوزات: ${sortedBookings.length}</div>
          <div class="info-badge">👥 إجمالي الضيوف: ${totalGuests}</div>
          <div class="info-badge">💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م</div>
        </div>
      </div>
      
      <!-- الحجوزات -->
      ${bookingCards}
      
      <!-- الملخص -->
      <div class="summary">
        <h3>📊 ملخص التقرير</h3>
        <div class="summary-stats">
          <div class="stat-card">
            <div class="stat-label">عدد الحجوزات</div>
            <div class="stat-value">${sortedBookings.length}</div>
            <div class="stat-label">حجز</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">إجمالي الضيوف</div>
            <div class="stat-value">${totalGuests}</div>
            <div class="stat-label">شخص</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">متوسط الضيوف</div>
            <div class="stat-value">${sortedBookings.length > 0 ? Math.round(totalGuests / sortedBookings.length) : 0}</div>
            <div class="stat-label">شخص/حجز</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">القيمة الإجمالية</div>
            <div class="stat-value">${totalAmount.toLocaleString('ar-EG')}</div>
            <div class="stat-label">جنية مصري</div>
          </div>
        </div>
      </div>
      
      <!-- أزرار التحكم -->
      <div class="controls no-print">
        <button class="btn" onclick="window.print()">
          <span>🖨️</span> طباعة التقرير
        </button>
        <button class="btn btn-close" onclick="window.close()">
          <span>✖</span> إغلاق النافذة
        </button>
      </div>
      
      <!-- الفوتر -->
      <div class="footer">
        <p>تم إنشاء هذا التقرير تلقائياً بواسطة نظام إدارة الحجوزات - المطعم الفاخر</p>
        <p>${currentDate} - نموذج توزيع على أقسام المطبخ والإدارة</p>
      </div>
      
      <script>
        // طباعة تلقائية بعد تحميل الصفحة
        window.onload = function() {
          // إذا أردت الطباعة التلقائية، فك التعليق عن السطر التالي
          // setTimeout(() => { window.print(); }, 1000);
        };
        
        // إضافة تأثيرات للطباعة
        document.addEventListener('DOMContentLoaded', function() {
          // إضافة فاصل زمني بين ظهور الكروت
          const cards = document.querySelectorAll('.booking-card');
          cards.forEach((card, index) => {
            card.style.animationDelay = \`\${index * 0.1}s\`;
          });
        });
      </script>
    </body>
    </html>
  `;
  }

  printCompactBookings(bookingType: number): void {
    const filteredBookings = this.allBookings.filter(
      (booking) => booking.bookingType === bookingType,
    );

    if (filteredBookings.length === 0) {
      this.showAlert('لا توجد حجوزات من هذا النوع', 'warning');
      return;
    }

    const typeName = this.getBookingTypeText(bookingType);
    const printWindow = window.open('', '_blank', 'width=900,height=700');

    if (!printWindow) {
      this.showAlert('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير', 'error');
      return;
    }

    const compactContent = this.generateCompactTableContent(
      filteredBookings,
      typeName,
    );
    printWindow.document.open();
    printWindow.document.write(compactContent);
    printWindow.document.close();
  }
  printOnlyBookings(bookingType: number): void {
    // فلترة الحجوزات حسب النوع
    const filteredBookings = this.allBookings.filter(
      (booking) => booking.bookingType === bookingType,
    );

    if (filteredBookings.length === 0) {
      this.showAlert('لا توجد حجوزات من هذا النوع', 'warning');
      return;
    }

    // تحديد اسم النوع للعرض
    const typeName = this.getBookingTypeText(bookingType);

    // إنشاء نافذة طباعة
    const printWindow = window.open('', '_blank', 'width=900,height=700');

    if (!printWindow) {
      this.showAlert('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير', 'error');
      return;
    }

    // إنشاء محتوى مبسط جداً
    const simpleContent = this.generateStationContent(
      filteredBookings,
      typeName,
    );

    printWindow.document.open();
    printWindow.document.write(simpleContent);
    printWindow.document.close();
  }

  /**
   * توليد محتوى طباعة بسيط جداً (الحجوزات فقط)
   */
  generateMinimalPrintContent(bookings: any[], title: string): string {
    // ترتيب الحجوزات حسب التاريخ
    const sortedBookings = [...bookings].sort((a, b) => {
      return (
        new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime()
      );
    });

    // التاريخ الحالي
    const currentDate = new Date().toLocaleDateString('ar-EG');

    // إجماليات
    const totalGuests = sortedBookings.reduce(
      (sum, booking) => sum + (booking.guestsCount || 0),
      0,
    );
    const totalAmount = sortedBookings.reduce((sum, booking) => {
      if (booking.meals && booking.meals.length > 0) {
        return (
          sum +
          booking.meals.reduce((mealSum: number, meal: any) => {
            return mealSum + (meal.quantity || 0) * (meal.unitPrice || 0);
          }, 0)
        );
      }
      return sum;
    }, 0);

    // إنشاء جدول الحجوزات (كل حجز في سطر واحد)
    let tableRows = '';
    sortedBookings.forEach((booking, index) => {
      const bookingDate = new Date(booking.bookingDate);
      const formattedDate = bookingDate.toLocaleDateString('ar-EG');
      const time = this.formatTime(booking.bookingTime);

      // حساب إجمالي الوجبات وعرضها كلها
      let mealsTotal = 0;
      let mealsList = '';

      if (booking.meals && booking.meals.length > 0) {
        mealsTotal = booking.meals.reduce((sum: number, meal: any) => {
          return sum + (meal.quantity || 0) * (meal.unitPrice || 0);
        }, 0);

        // عرض كل الوجبات في قائمة مدمجة
        mealsList = booking.meals
          .map(
            (meal: any) =>
              `<div class="meal-item">${meal.mealName} ×${meal.quantity} = ${(meal.quantity || 0) * (meal.unitPrice || 0)} ج.م</div>`,
          )
          .join('');
      } else {
        mealsList = '<div class="no-meals">لا توجد وجبات</div>';
      }

      // المبلغ المتبقي
      const remainingAmount = mealsTotal - (booking.depositAmount || 0);

      tableRows += `
      <tr>
        <td class="text-center"><strong>${index + 1}</strong></td>
        <td class="client-cell">
          <div><strong>${booking.clientName || 'غير محدد'}</strong></div>
          <div class="phone">${booking.clientPhone || ''}</div>
        </td>
        <td class="text-center">${booking.guestsCount || 0}</td>
        <td class="text-center">
          <div>${formattedDate}</div>
          <div class="time">${time}</div>
        </td>
        <td class="text-center">${this.getVenueName(booking.venueId)}</td>
        <td class="meals-cell">
          ${mealsList}
          ${mealsTotal > 0 ? `<div class="meal-total"><strong>الإجمالي: ${mealsTotal.toLocaleString('ar-EG')} ج.م</strong></div>` : ''}
        </td>
        <td class="payment-cell">
          <div class="payment-paid">مدفوع: ${(booking.depositAmount || 0).toLocaleString('ar-EG')} ج.م</div>
          <div class="payment-remaining">متبقي: ${remainingAmount.toLocaleString('ar-EG')} ج.م</div>
        </td>
        <td class="notes-cell">${booking.note || 'لا توجد ملاحظات'}</td>
      </tr>
    `;
    });

    return `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${title} - حجوزات فقط</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Arial', sans-serif;
        }
        
        body {
          padding: 10px;
          background: white;
          font-size: 12px;
        }
        
        @media print {
          @page {
            size: A4;
            margin: 5mm;
          }
          
          body {
            padding: 0;
            font-size: 11px;
          }
          
          .no-print {
            display: none !important;
          }
        }
        
        /* العنوان */
        .header-minimal {
          text-align: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #2c3e50;
        }
        
        .header-minimal h1 {
          font-size: 22px;
          color: #2c3e50;
          margin: 0;
        }
        
        .header-minimal .date {
          color: #666;
          font-size: 14px;
          margin-top: 5px;
        }
        
        /* الجدول */
        .minimal-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        
        .minimal-table th {
          background: #2c3e50;
          color: white;
          padding: 8px 4px;
          text-align: center;
          border: 1px solid #ddd;
          font-weight: bold;
          white-space: nowrap;
        }
        
        .minimal-table td {
          padding: 6px 4px;
          border: 1px solid #ddd;
          vertical-align: top;
        }
        
        .minimal-table tr:nth-child(even) {
          background: #f8f9fa;
        }
        
        .minimal-table tr:hover {
          background: #e3f2fd;
        }
        
        /* أبعاد الأعمدة */
        .minimal-table th:nth-child(1),
        .minimal-table td:nth-child(1) { 
          width: 40px; 
          text-align: center;
        }
        
        .minimal-table th:nth-child(2),
        .minimal-table td:nth-child(2) { 
          width: 150px; 
          text-align: right;
        }
        
        .minimal-table th:nth-child(3),
        .minimal-table td:nth-child(3) { 
          width: 50px; 
          text-align: center;
        }
        
        .minimal-table th:nth-child(4),
        .minimal-table td:nth-child(4) { 
          width: 80px; 
          text-align: center;
        }
        
        .minimal-table th:nth-child(5),
        .minimal-table td:nth-child(5) { 
          width: 100px; 
          text-align: center;
        }
        
        .minimal-table th:nth-child(6),
        .minimal-table td:nth-child(6) { 
          width: 200px;
        }
        
        .minimal-table th:nth-child(7),
        .minimal-table td:nth-child(7) { 
          width: 100px;
        }
        
        .minimal-table th:nth-child(8),
        .minimal-table td:nth-child(8) { 
          width: 120px;
        }
        
        /* محتوى الخلايا */
        .client-cell {
          text-align: right;
        }
        
        .client-cell .phone {
          font-size: 10px;
          color: #666;
          margin-top: 2px;
        }
        
        .time {
          font-size: 10px;
          color: #666;
          margin-top: 2px;
        }
        
        /* خلية الوجبات */
        .meals-cell {
          font-size: 10px;
        }
        
        .meal-item {
          padding: 2px 0;
          border-bottom: 1px dashed #eee;
          line-height: 1.3;
        }
        
        .meal-item:last-child {
          border-bottom: none;
        }
        
        .meal-total {
          background: #e8f5e8;
          padding: 3px 5px;
          border-radius: 3px;
          margin-top: 5px;
          text-align: center;
          font-weight: bold;
          color: #27ae60;
        }
        
        .no-meals {
          text-align: center;
          color: #95a5a6;
          font-style: italic;
          padding: 5px;
        }
        
        /* خلية المدفوعات */
        .payment-cell {
          font-size: 10px;
        }
        
        .payment-paid {
          color: #27ae60;
          font-weight: bold;
          margin-bottom: 3px;
        }
        
        .payment-remaining {
          color: #e74c3c;
          font-weight: bold;
        }
        
        /* خلية الملاحظات */
        .notes-cell {
          font-size: 10px;
          color: #7f8c8d;
          line-height: 1.3;
        }
        
        /* الصف الإجمالي */
        .total-row {
          background: #e8f5e8 !important;
          font-weight: bold;
          border-top: 2px solid #2c3e50;
        }
        
        .total-row td {
          text-align: center;
          padding: 8px;
        }
        
        /* الأزرار */
        .controls {
          text-align: center;
          margin-top: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 5px;
          border: 1px solid #ddd;
        }
        
        .btn {
          background: #3498db;
          color: white;
          border: none;
          padding: 8px 20px;
          font-size: 14px;
          border-radius: 4px;
          cursor: pointer;
          margin: 0 5px;
        }
        
        .btn:hover {
          background: #2980b9;
        }
        
        .btn-close {
          background: #e74c3c;
        }
        
        .btn-close:hover {
          background: #c0392b;
        }
        
        /* محاذاة */
        .text-center {
          text-align: center !important;
        }
        
        .text-right {
          text-align: right !important;
        }
      </style>
    </head>
    <body>
      <!-- العنوان -->
      <div class="header-minimal">
        <h1>${title}</h1>
        <div class="date">تاريخ الطباعة: ${currentDate}</div>
      </div>
      
      <!-- الجدول -->
      <table class="minimal-table">
        <thead>
          <tr>
            <th>م</th>
            <th>العميل</th>
            <th>الضيوف</th>
            <th>التاريخ/الوقت</th>
            <th>المكان</th>
            <th>الوجبات</th>
            <th>المدفوعات</th>
            <th>ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
          <!-- الصف الإجمالي -->
          <tr class="total-row">
            <td colspan="2"><strong>الإجمالي</strong></td>
            <td><strong>${totalGuests}</strong></td>
            <td colspan="3"></td>
            <td><strong>${totalAmount.toLocaleString('ar-EG')} ج.م</strong></td>
            <td></td>
          </tr>
        </tbody>
      </table>
      
      <!-- الأزرار -->
      <div class="controls no-print">
        <button class="btn" onclick="window.print()">🖨️ طباعة</button>
        <button class="btn btn-close" onclick="window.close()">✖ إغلاق</button>
      </div>
      
      <script>
        window.onload = function() {
          // للطباعة التلقائية
          // window.print();
        };
      </script>
    </body>
    </html>
  `;
  }
  /**
   * توليد جدول مدمج للحجوزات
   */
  generateCompactTableContent(bookings: any[], title: string): string {
    // ترتيب الحجوزات حسب التاريخ والوقت
    const sortedBookings = [...bookings].sort((a, b) => {
      const dateA = new Date(a.bookingDate + 'T' + (a.bookingTime || '00:00'));
      const dateB = new Date(b.bookingDate + 'T' + (b.bookingTime || '00:00'));
      return dateA.getTime() - dateB.getTime();
    });

    // التاريخ الحالي
    const currentDate = new Date().toLocaleDateString('ar-EG');

    // إنشاء صفوف الجدول
    let tableRows = '';
    sortedBookings.forEach((booking, index) => {
      const bookingDate = new Date(booking.bookingDate);
      const formattedDate = bookingDate.toLocaleDateString('ar-EG');
      const time = this.formatTime(booking.bookingTime);

      // حساب إجمالي الوجبات
      let mealsTotal = 0;
      let mealsList = '';

      if (booking.meals && booking.meals.length > 0) {
        mealsTotal = booking.meals.reduce((sum: number, meal: any) => {
          return sum + (meal.quantity || 0) * (meal.unitPrice || 0);
        }, 0);

        mealsList = booking.meals
          .map((meal: any) => `${meal.mealName} (${meal.quantity})`)
          .join('، ');
      }

      tableRows += `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td>${booking.clientName || 'غير محدد'}</td>
        <td>${booking.clientPhone || ''}</td>
        <td>${booking.guestsCount || 0}</td>
        <td>${formattedDate}</td>
        <td>${time}</td>
        <td>${this.getVenueName(booking.venueId)}</td>
        <td>${booking.bookingId || ''}</td>
        <td class="meals-cell">
          ${mealsList || 'لا توجد وجبات'}
        </td>
        <td class="text-center">${mealsTotal.toLocaleString('ar-EG')}</td>
        <td class="text-center">${(booking.depositAmount || 0).toLocaleString('ar-EG')}</td>
        <td class="text-center">${(mealsTotal - (booking.depositAmount || 0)).toLocaleString('ar-EG')}</td>
      </tr>
    `;
    });

    // إجماليات
    const totalGuests = sortedBookings.reduce(
      (sum, booking) => sum + (booking.guestsCount || 0),
      0,
    );
    const totalAmount = sortedBookings.reduce((sum, booking) => {
      if (booking.meals && booking.meals.length > 0) {
        return (
          sum +
          booking.meals.reduce((mealSum: number, meal: any) => {
            return mealSum + (meal.quantity || 0) * (meal.unitPrice || 0);
          }, 0)
        );
      }
      return sum;
    }, 0);
    const totalPaid = sortedBookings.reduce(
      (sum, booking) => sum + (booking.depositAmount || 0),
      0,
    );

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
          font-family: 'Arial', sans-serif;
        }
        
        body {
          padding: 15px;
          background: white;
          font-size: 13px;
        }
        
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          
          body {
            padding: 0;
            background: white;
            font-size: 12px;
          }
          
          .no-print {
            display: none !important;
          }
        }
        
        /* العنوان */
        .header-compact {
          text-align: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #333;
        }
        
        .header-compact h1 {
          font-size: 22px;
          color: #333;
          margin-bottom: 5px;
        }
        
        .header-compact .date {
          color: #666;
          font-size: 14px;
        }
        
        /* الجدول */
        .compact-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 12px;
        }
        
        .compact-table th {
          background: #2c3e50;
          color: white;
          padding: 8px 5px;
          text-align: center;
          border: 1px solid #ddd;
          font-weight: bold;
          white-space: nowrap;
        }
        
        .compact-table td {
          padding: 6px 4px;
          border: 1px solid #ddd;
          text-align: right;
          vertical-align: top;
        }
        
        .compact-table tr:nth-child(even) {
          background: #f8f9fa;
        }
        
        .compact-table tr:hover {
          background: #e3f2fd;
        }
        
        /* أعمدة خاصة */
        .compact-table td:nth-child(2) { /* العميل */
          min-width: 120px;
          max-width: 150px;
        }
        
        .meals-cell {
          min-width: 200px;
          max-width: 300px;
          font-size: 11px;
          line-height: 1.3;
        }
        
        .compact-table td:nth-child(4), /* الضيوف */
        .compact-table td:nth-child(5), /* التاريخ */
        .compact-table td:nth-child(6), /* الوقت */
        .compact-table td:nth-child(8) { /* رقم الحجز */
          white-space: nowrap;
          width: 70px;
        }
        
        .compact-table td:nth-child(10), /* الإجمالي */
        .compact-table td:nth-child(11), /* المدفوع */
        .compact-table td:nth-child(12) { /* المتبقي */
          width: 80px;
          text-align: center;
        }
        
        /* الصف الإجمالي */
        .total-row {
          background: #e8f5e8 !important;
          font-weight: bold;
          border-top: 2px solid #333;
        }
        
        .total-row td {
          text-align: center !important;
          padding: 8px !important;
        }
        
        /* الأزرار */
        .controls {
          text-align: center;
          margin-top: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 5px;
          border: 1px solid #ddd;
        }
        
        .btn {
          background: #3498db;
          color: white;
          border: none;
          padding: 8px 20px;
          font-size: 14px;
          border-radius: 4px;
          cursor: pointer;
          margin: 0 5px;
        }
        
        .btn:hover {
          background: #2980b9;
        }
        
        .btn-close {
          background: #e74c3c;
        }
        
        .btn-close:hover {
          background: #c0392b;
        }
        
        /* الفوتر */
        .footer-compact {
          text-align: center;
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px solid #ddd;
          color: #666;
          font-size: 11px;
        }
        
        /* محاذاة */
        .text-center {
          text-align: center !important;
        }
        
        .text-right {
          text-align: right !important;
        }
        
        .text-left {
          text-align: left !important;
        }
      </style>
    </head>
    <body>
      <!-- العنوان -->
      <div class="header-compact">
        <h1>${title} - جدول الحجوزات</h1>
        <div class="date">تاريخ الطباعة: ${currentDate}</div>
      </div>
      
      <!-- الجدول -->
      <table class="compact-table">
        <thead>
          <tr>
            <th width="40">م</th>
            <th width="150">اسم العميل</th>
            <th width="100">رقم الهاتف</th>
            <th width="60">الضيوف</th>
            <th width="80">التاريخ</th>
            <th width="60">الوقت</th>
            <th width="100">المكان</th>
            <th width="70">رقم الحجز</th>
            <th width="200">الوجبات</th>
            <th width="80">الإجمالي</th>
            <th width="80">المدفوع</th>
            <th width="80">المتبقي</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
          <!-- الصف الإجمالي -->
          <tr class="total-row">غغغغغ
            <td colspan="3"><strong>الإجمالي</strong></td>
            <td><strong>${totalGuests}</strong></td>
            <td colspan="4"></td>
            <td></td>
            <td><strong>${totalAmount.toLocaleString('ar-EG')}</strong></td>
            <td><strong>${totalPaid.toLocaleString('ar-EG')}</strong></td>
            <td><strong>${(totalAmount - totalPaid).toLocaleString('ar-EG')}</strong></td>
          </tr>
        </tbody>
      </table>
      
      <!-- الأزرار -->
      <div class="controls no-print">
        <button class="btn" onclick="window.print()">🖨️ طباعة</button>
        <button class="btn btn-close" onclick="window.close()">✖ إغلاق</button>
      </div>
      
      <!-- الفوتر -->
      <div class="footer-compact">
        <p>نموذج توزيع داخلي - المطعم الفاخر</p>
      </div>
      
      <script>
        // طباعة تلقائية
        window.onload = function() {
          // للطباعة التلقائية، فك التعليق
          // window.print();
        };
      </script>
    </body>
    </html>
  `;
  }

  // 4. دالة لفتح نافذة الطباعة
  openPrintWindow(bookings: any[], title: string): void {
    // إنشاء نافذة جديدة للطباعة
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (!printWindow) {
      this.showAlert('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير', 'error');
      return;
    }

    // إنشاء محتوى HTML للتقرير
    const printContent = this.generatePrintContent(bookings, title);

    // كتابة المحتوى في نافذة الطباعة
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
  }
  // 5. دالة لتوليد محتوى الطباعة
  generatePrintContent(bookings: any[], title: string): string {
    // ترتيب الحجوزات حسب التاريخ والوقت
    const sortedBookings = [...bookings].sort((a, b) => {
      const dateA = new Date(a.bookingDate + 'T' + (a.bookingTime || '00:00'));
      const dateB = new Date(b.bookingDate + 'T' + (b.bookingTime || '00:00'));
      return dateA.getTime() - dateB.getTime();
    });

    // حساب الإحصائيات
    const totalGuests = sortedBookings.reduce(
      (sum, booking) => sum + (booking.guestsCount || 0),
      0,
    );
    const totalAmount = sortedBookings.reduce(
      (sum, booking) => sum + (booking.totalAmount || 0),
      0,
    );

    // التاريخ الحالي
    const currentDate = new Date().toLocaleDateString('ar-EG');
    const currentTime = new Date().toLocaleTimeString('ar-EG');

    // إنشاء جدول HTML
    let tableRows = '';

    sortedBookings.forEach((booking, index) => {
      const bookingDate = new Date(booking.bookingDate);
      const formattedDate = bookingDate.toLocaleDateString('ar-EG');
      const dayName = this.getArabicDay(booking.bookingDate);
      const time = this.formatTime(booking.bookingTime);

      tableRows += `
      <tr>
        <td>${index + 1}</td>
        <td>${booking.clientName || 'غير محدد'}</td>
        <td>${booking.clientPhone || ''}</td>
        <td>${formattedDate}<br><small>${dayName}</small></td>
        <td>${time}</td>
        <td>${this.getVenueName(booking.venueId)}</td>
        <td>${booking.guestsCount || 0}</td>
        <td>${(booking.totalAmount || 0).toLocaleString('ar-EG')} ج.م</td>
        <td>${this.getStatusText(booking.bookingStatus)}</td>
        <td>${booking.bookingId || ''}</td>
      </tr>
    `;
    });

    // إرجاع محتوى HTML كامل
    return `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${title} - تقرير الحجوزات</title>
      <style>
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #000;
            background: white;
            margin: 0;
            padding: 0;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-header {
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          
          .print-footer {
            margin-top: 20px;
            border-top: 1px solid #ccc;
            padding-top: 10px;
            font-size: 12px;
            text-align: center;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
          }
          
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          
          .header-row {
            background-color: #e0e0e0;
          }
          
          .total-row {
            background-color: #f8f8f8;
            font-weight: bold;
          }
        }
        
        body {
          font-family: 'Arial', sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #000;
          background: white;
          margin: 20px;
          padding: 0;
        }
        
        .no-print {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .print-header {
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        
        .print-footer {
          margin-top: 20px;
          border-top: 1px solid #ccc;
          padding-top: 10px;
          font-size: 12px;
          text-align: center;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 8px;
          text-align: center;
        }
        
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        
        .header-row {
          background-color: #e0e0e0;
        }
        
        .total-row {
          background-color: #f8f8f8;
          font-weight: bold;
        }
        
        button {
          background-color: #007bff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        button:hover {
          background-color: #0056b3;
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <div style="text-align: center; margin-bottom: 15px;">
          <h1>${title}</h1>
          <h3>تقرير حجوزات المطعم</h3>
          <p>تاريخ التقرير: ${currentDate} - الساعة: ${currentTime}</p>
        </div>
        
        <div style="text-align: right; margin-bottom: 15px;">
          <p><strong>إجمالي عدد الحجوزات:</strong> ${sortedBookings.length}</p>
          <p><strong>إجمالي عدد الضيوف:</strong> ${totalGuests}</p>
          <p><strong>إجمالي المبلغ:</strong> ${totalAmount.toLocaleString('ar-EG')} جنيه مصري</p>
        </div>
      </div>
      
      <table>
        <thead>
          <tr class="header-row">
            <th width="40">#</th>
            <th width="150">اسم العميل</th>
            <th width="100">رقم الهاتف</th>
            <th width="100">التاريخ</th>
            <th width="80">الوقت</th>
            <th width="120">المكان</th>
            <th width="70">العدد</th>
            <th width="90">المبلغ</th>
            <th width="80">الحالة</th>
            <th width="80">رقم الحجز</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
          <tr class="total-row">
            <td colspan="6" style="text-align: right;"><strong>الإجمالي:</strong></td>
            <td><strong>${totalGuests}</strong></td>
            <td><strong>${totalAmount.toLocaleString('ar-EG')} ج.م</strong></td>
            <td colspan="2"></td>
          </tr>
        </tbody>
      </table>
      
      <div class="print-footer">
        <p>نموذج طباعة حجوزات المطعم</p>
        <p>تم إنشاء التقرير تلقائياً بواسطة نظام إدارة الحجوزات</p>
      </div>
      
      <div class="no-print">
        <button onclick="window.print()">طباعة التقرير</button>
        <button onclick="window.close()" style="background-color: #6c757d; margin-right: 10px;">إغلاق</button>
      </div>
      
      <script>
        // طباعة المستند تلقائياً عند التحميل
        window.onload = function() {
          // يمكن تفعيل الطباعة التلقائية إذا رغبت
          // window.print();
        };
      </script>
    </body>
    </html>
  `;
  }
  // 6. دالة لتوليد محتوى طباعة مبسط (يشبه الصورة تماماً)
 

  // 7. دالة لعرض تنبيه
  showAlert(message: string, type: string = 'info'): void {
    switch (type) {
      case 'warning':
        this.toastr.warning(message);
        break;
      case 'error':
        this.toastr.error(message);
        break;
      default:
        this.toastr.info(message);
        break;
    }
  }

  // 8. دالة مساعدة لتنسيق التاريخ للفلترة
  formatDateForFilter(dateString: string): string {
    if (!dateString) return '';

    try {
      // محاولة تحويل النص إلى تاريخ
      const date = new Date(dateString);

      // التحقق إذا كان التاريخ صالحاً
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }

      // إذا فشل التحويل، حاول استخراج التاريخ مباشرة من النص
      return dateString.split('T')[0] || '';
    } catch {
      return '';
    }
  }

  // ================= CALCULATE STATISTICS =================
  calculateStatistics(): void {
    this.totalBookings = this.bookings.length;
    this.confirmedBookings = this.bookings.filter(
      (b) => b.bookingStatus === BookingStatus.Confirmed,
    ).length;
    this.pendingBookings = this.bookings.filter(
      (b) => b.bookingStatus === BookingStatus.Pending,
    ).length;
    this.cancelledBookings = this.bookings.filter(
      (b) => b.bookingStatus === BookingStatus.Cancelled,
    ).length;
    this.postponedBookings = this.bookings.filter(
      (b) => b.bookingStatus === BookingStatus.Postponed,
    ).length;
    this.completedBookings = this.bookings.filter(
      (b) => b.bookingStatus === BookingStatus.Complete,
    ).length;
  }

  loadVenues(): void {
    this.venueService.getAll().subscribe({
      next: (res) => {
        this.venues = res; // خليها كلها
      },
      error: () => console.error('فشل تحميل الأماكن'),
    });
  }

  // ================= FILTER BOOKINGS =================
  filterBookings(): void {
    let result = [...this.bookings];

    const term = this.searchTerm.trim().toLowerCase();

    // ================== بحث النص ==================
    if (term) {
      result = result.filter(
        (b) =>
          b.clientName?.toLowerCase().includes(term) ||
          b.clientPhone?.includes(term) ||
          (b.clientMobile && b.clientMobile.includes(term)) ||
          b.bookingId.toString().includes(term) ||
          this.getVenueName(b.venueId).toLowerCase().includes(term),
      );
    }

    // ================== فلتر حسب النوع ==================
    if (this.typeFilter !== '') {
      const typeNum = parseInt(this.typeFilter);
      if (!isNaN(typeNum)) {
        result = result.filter((b) => b.bookingType === typeNum);
      }
    }

    // ================== فلتر حسب الحالة ==================
    if (this.statusFilter !== '') {
      const statusNum = parseInt(this.statusFilter);
      if (!isNaN(statusNum)) {
        result = result.filter((b) => b.bookingStatus === statusNum);
      }
    }

    // ================== فلتر حسب المكان ================== ✅
    if (this.venueFilter !== '') {
      const venueNum = parseInt(this.venueFilter);
      if (!isNaN(venueNum)) {
        result = result.filter((b) => b.venueId === venueNum);
      }
    }

    // ================== فلتر حسب التاريخ ==================
    if (this.dateFrom) {
      const fromDate = this.parseDateOnly(this.dateFrom);
      result = result.filter((b) => {
        const bookingDate = this.parseDateOnly(b.bookingDate);
        return bookingDate.getTime() >= fromDate.getTime();
      });
    }

    if (this.dateTo) {
      const toDate = this.parseDateOnly(this.dateTo);
      result = result.filter((b) => {
        const bookingDate = this.parseDateOnly(b.bookingDate);
        return bookingDate.getTime() <= toDate.getTime();
      });
    }
    if (this.dateOnly) {
      // dateOnly هو متغير جديد مرتبط بالـ input
      const targetDate = this.parseDateOnly(this.dateOnly);
      result = result.filter((b) => {
        const bookingDate = this.parseDateOnly(b.bookingDate);
        return bookingDate.getTime() === targetDate.getTime();
      });
    }

    // ================== تحديث النتيجة ==================
    this.filteredBookings = result;
    this.currentPage = 1;
    this.updatePagination();
  }
  // ================= PAGINATION =================
  updatePagination(): void {
    this.totalPages = Math.ceil(
      this.filteredBookings.length / this.itemsPerPage,
    );

    // حساب صفحات التنقل
    const maxVisiblePages = 5;
    let startPage = Math.max(
      1,
      this.currentPage - Math.floor(maxVisiblePages / 2),
    );
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > this.totalPages) {
      endPage = this.totalPages;
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    this.pages = [];
    for (let i = startPage; i <= endPage; i++) {
      this.pages.push(i);
    }
  }

  get paginatedBookings(): Booking[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredBookings.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  // ================= HELPER METHODS =================
  getVenueName(venueId?: number): string {
    if (!venueId) return '-';

    // انتبه للحقل الصحيح من الـ backend
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

  getBookingTypeClass(type: BookingType): string {
    switch (type) {
      case BookingType.RamadanIftar:
        return 'badge badge-iftar';
      case BookingType.RamadanSuhoor:
        return 'badge badge-suhur';
      case BookingType.Wedding:
        return 'badge badge-wedding';
      case BookingType.ShipTrip:
        return 'badge badge-ship';
      default:
        return 'badge badge-secondary';
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
        return 'مؤجل'; // ✅ أضفنا المتأجل
      default:
        return 'غير محدد';
    }
  }

  getStatusClass(status: BookingStatus): string {
    switch (status) {
      case BookingStatus.Pending:
        return 'badge-pending';
      case BookingStatus.Confirmed:
        return 'badge-confirmed';
      case BookingStatus.Cancelled:
        return 'badge-cancelled';
      case BookingStatus.Postponed:
        return 'badge-postponed';
      default:
        return 'badge-secondary';
    }
  }

  getArabicDay(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const days = [
        'الأحد',
        'الإثنين',
        'الثلاثاء',
        'الأربعاء',
        'الخميس',
        'الجمعة',
        'السبت',
      ];
      return days[date.getDay()];
    } catch {
      return '';
    }
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // HH:mm
  }

  // ================= ACTION METHODS =================
  createBooking(): void {
    this.router.navigate(['/bookings/new']);
  }

  viewDetails(id?: number): void {
    if (id) {
      this.router.navigate(['/bookings/details', id]);
    }
  }

  editBooking(id?: number): void {
    if (id) {
      this.router.navigate(['/bookings/edit', id]);
    }
  }

  confirmBooking(booking: Booking): void {
    Swal.fire({
      title: `هل تريد تأكيد حجز ${booking.clientName}؟`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'نعم، أكد الحجز',
      cancelButtonText: 'إلغاء',
    }).then((result) => {
      if (result.isConfirmed) {
        this.bookingService
          .updateBookingStatus(booking.bookingId!, 'Confirmed')
          .subscribe({
            next: () => {
              Swal.fire('تم التأكيد!', 'تم تأكيد الحجز بنجاح', 'success');
              this.fetchBookings(); // لتجديد الصفحة أو البيانات
            },
            error: (err) => {
              console.error(err);
              Swal.fire(
                'خطأ',
                err?.error?.message || 'فشل في تأكيد الحجز',
                'error',
              );
            },
          });
      }
    });
  }

  cancelBooking(booking: Booking): void {
    Swal.fire({
      title: `هل تريد إلغاء حجز ${booking.clientName}؟`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، إلغاء الحجز',
      cancelButtonText: 'تراجع',
    }).then((result) => {
      if (result.isConfirmed) {
        this.bookingService
          .updateBookingStatus(booking.bookingId!, 'Cancelled')
          .subscribe({
            next: () => {
              Swal.fire('تم الإلغاء!', 'تم إلغاء الحجز بنجاح', 'success');
              this.fetchBookings(); // لتجديد البيانات
            },
            error: (err) => {
              console.error(err);
              Swal.fire(
                'خطأ',
                err?.error?.message || 'فشل في إلغاء الحجز',
                'error',
              );
            },
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
        min: new Date().toISOString().split('T')[0], // لا يمكن اختيار تاريخ قديم
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const newDate = result.value; // YYYY-MM-DD
        this.bookingService
          .updateBookingStatus(booking.bookingId!, 'Postponed', newDate)
          .subscribe({
            next: () => {
              Swal.fire(
                'تم التأجيل!',
                `تم تأجيل الحجز إلى ${newDate}`,
                'success',
              );
              this.fetchBookings(); // لتحديث القائمة بعد التعديل
            },
            error: (err) => {
              console.error(err);
              Swal.fire(
                'خطأ',
                err?.error?.message || 'فشل في تأجيل الحجز',
                'error',
              );
            },
          });
      }
    });
  }
  openedMenuId: number | null = null;

  toggleActionsMenu(id: number, event: MouseEvent) {
    event.stopPropagation(); // يمنع إغلاقها فورًا
    this.openedMenuId = this.openedMenuId === id ? null : id;
  }

  closeMenu() {
    this.openedMenuId = null;
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.closeMenu();
  }
  // إغلاق القائمة
  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm ||
      this.statusFilter !== '' ||
      this.typeFilter !== '' ||
      this.venueFilter !== '' ||
      this.dateFrom ||
      this.dateTo
    );
  }

  // حساب عدد الفلاتر النشطة
  countActiveFilters(): number {
    let count = 0;
    if (this.searchTerm) count++;
    if (this.statusFilter !== '') count++;
    if (this.typeFilter !== '') count++;
    if (this.venueFilter !== '') count++;
    if (this.dateFrom) count++;
    if (this.dateTo) count++;
    return count;
  }
  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.venueFilter = ''; // أضف هذا ✅

    this.typeFilter = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.filterBookings();
  }

  // ================= FOR TESTING =================
  // دالة لاختبار إذا كانت الحجوزات موجودة
  get hasBookings(): boolean {
    return this.bookings.length > 0;
  }

  // دالة لعدد الحجوزات الحالية
  get displayCount(): string {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(
      this.currentPage * this.itemsPerPage,
      this.filteredBookings.length,
    );
    return `عرض ${start} إلى ${end} من ${this.filteredBookings.length}`;
  }

  // ==================== PRINT FUNCTIONS ====================

  printCustomerReceipt(bookingId: number): void {
    this.bookingService.getBookingById(bookingId).subscribe({
      next: (res) => {
        const booking = res.data; // GetBookingDto

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
          this.toastr.error('يرجى السماح بالنوافذ المنبثقة');
          return;
        }

        const receiptContent = this.generateCustomerReceipt(booking);

        printWindow.document.open();
        printWindow.document.write(receiptContent);
        printWindow.document.close();

        this.toastr.success(`تم إنشاء فاتورة للعميل ${booking.clientName}`);
      },
      error: () => {
        this.toastr.error('فشل تحميل بيانات الحجز للطباعة');
      },
    });
  }

  generateCustomerReceipt(booking: any): string {
    const bookingDate = new Date(booking.bookingDate);
    const formattedDate = bookingDate.toLocaleDateString('ar-EG');
    const time = this.formatTime(booking.bookingTime);

    const meals = booking.bookingMeals || [];
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
      <strong>ملاحظة:</strong>  يرجى مراجعة بيانات الحجز والرد بالتأكيد خلال ربع ساعةوفي حالة عد الرد يعتر الببانات مؤكد
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
          <span>📞 01008670818</span>
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

  showPrintDropdown = false;

  togglePrintDropdown() {
    this.showPrintDropdown = !this.showPrintDropdown;
  }

  closePrintDropdown() {
    this.showPrintDropdown = false;
  }
}
