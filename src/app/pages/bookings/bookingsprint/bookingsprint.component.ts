import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Booking, BookingService, BookingStatus, BookingType } from 'src/app/services/booking.service';
import { Meal, MealService } from 'src/app/services/meal.service';
import { VenueService } from 'src/app/services/venue.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-bookingsprint',
  templateUrl: './bookingsprint.component.html',
  styleUrls: ['./bookingsprint.component.scss']
})
export class BookingsprintComponent implements OnInit {

  bookings: Booking[] = [];
  filteredBookings: Booking[] = [];
  mealsList: Meal[] = [];
  loading = false;
  
  // ==================== FILTERS ====================
filterType: number | 'all' = 'all';       // 5 , 6
filterStatus: number | 'all' = 'all';     // 0 , 1 , 2 , 3
filterVenue: number | 'all' = 'all';
filterDate: string = '';
  
  // ==================== REPORT INFO ====================
  reportDate = new Date().toISOString().split('T')[0];
  currentTime = '';
  reportTitle = 'تقرير الحجوزات';
  
  // ==================== STATISTICS ====================
  totalBookings = 0;
  totalGuests = 0;
  totalAmount = 0;
  totalDeposit = 0;
  totalRemaining = 0;

  // ==================== TEMPLATES ====================
printTemplates = [
  { id: 'customer', name: 'فورم العميل', icon: '🧾' },
  { id: 'station', name: 'محطة التوزيع', icon: '📍' },
  { id: 'kitchen', name: 'مطبخ', icon: '👨‍🍳' },
  { id: 'financial', name: 'مالي', icon: '💰' },
  { id: 'compact', name: 'البوابة', icon: '📄' }
];

  activeTemplate = 'station';
  venues: any[] = [];

  constructor(
    private bookingService: BookingService,
    private mealService: MealService,
    private venueService: VenueService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.updateCurrentTime();
    this.loadMeals();
    this.loadVenues();
    this.parseRouteParams();
    this.fetchBookings();
    
    setInterval(() => {
      this.updateCurrentTime();
    }, 60000);
  }



  
  // ==================== FETCH BOOKINGS ====================
  fetchBookings(): void {
    this.loading = true;
    
    this.bookingService.getAllBookings().subscribe({
      next: (data) => {
        this.bookings = data.map(b => ({
          ...b,
          bookingType: BookingType[b.bookingType as unknown as keyof typeof BookingType],
          bookingStatus: BookingStatus[b.bookingStatus as unknown as keyof typeof BookingStatus]
        }));

        this.filteredBookings = [...this.bookings];
        this.calculateStatistics();
        this.loading = false;
        
        if (this.filteredBookings.length === 0) {
          this.toastr.info('لا توجد حجوزات تطابق الفلترة المطلوبة');
        }
      },
      error: (err) => {
        console.error('Error fetching bookings:', err);
        this.toastr.error('حدث خطأ أثناء جلب الحجوزات');
        this.loading = false;
      }
    });
  }




printCustomerReceipt(): void {
  if (this.filteredBookings.length === 0) {
    this.toastr.warning('لا توجد حجوزات للطباعة');
    return;
  }
  
  // طباعة فورم منفصل لكل حجز
  this.filteredBookings.forEach(booking => {
    const content = this.generateCustomerReceipt(booking);
    this.openPrintWindow(content, `فاتورة العميل - ${booking.clientName}`);
  });
}
generateCustomerReceipt(booking: any): string {
  const bookingDate = new Date(booking.bookingDate);
  const formattedDate = bookingDate.toLocaleDateString('ar-EG');
  const time = this.formatTime(booking.bookingTime);
  
  // حساب إجمالي الوجبات
  let mealsTotal = 0;
  let mealsRows = '';
  
  if (booking.meals && booking.meals.length > 0) {
    mealsTotal = booking.meals.reduce((sum: number, meal: any) => {
      return sum + ((meal.quantity || 0) * (meal.unitPrice || 0));
    }, 0);
    
    mealsRows = booking.meals.map((meal: any, index: number) => {
      const mealTotal = (meal.quantity || 0) * (meal.unitPrice || 0);
      return `
        <tr class="meal-row">
          <td class="text-center">${index + 1}</td>
          <td class="meal-name">${meal.mealName || 'غير محدد'}</td>
          <td class="text-center meal-qty">${meal.quantity || 0}</td>
          <td class="text-center meal-price">${(meal.unitPrice || 0).toLocaleString('ar-EG')} ج.م</td>
          <td class="text-center meal-total">${mealTotal.toLocaleString('ar-EG')} ج.م</td>
        </tr>
      `;
    }).join('');
  }
  
  const remaining = mealsTotal - (booking.depositAmount || 0);
  const currentDate = new Date().toLocaleDateString('ar-EG');
  const currentTime = new Date().toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة العميل - ${booking.clientName}</title>
      <style>
        /* إعدادات أساسية */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Arial', sans-serif;
        }
        
        body {
          padding: 10mm 8mm;
          background: white;
          color: #222;
          font-size: 13px;
          line-height: 1.3;
        }
        
        @media print {
          @page {
            size: A5;
            margin: 8mm 5mm;
          }
          
          body {
            padding: 5mm 4mm;
            font-size: 12px;
          }
          
          .no-print {
            display: none !important;
          }
        }
        
        /* ============ الترويسة ============ */
        .receipt-header {
          text-align: center;
          margin-bottom: 15px;
          padding-bottom: 12px;
          border-bottom: 2px solid #000;
        }
        
        .restaurant-name {
          color: #d32f2f;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .receipt-title {
          font-size: 16px;
          color: #333;
          margin-bottom: 8px;
          font-weight: 600;
        }
        
        .booking-meta {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
          font-size: 11px;
          color: #555;
        }
        
        /* ============ أقسام المعلومات ============ */
        .section {
          margin-bottom: 15px;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 5px;
          background: #f9f9f9;
        }
        
        .section-title {
          font-size: 14px;
          color: #2c3e50;
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 1px solid #ccc;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        /* ============ صفوف المعلومات ============ */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px 15px;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          min-height: 26px;
        }
        
        .info-label {
          color: #555;
          font-weight: bold;
          font-size: 12px;
          white-space: nowrap;
          min-width: 100px;
        }
        
        .info-value {
          color: #222;
          font-weight: 500;
          font-size: 13px;
          text-align: left;
          flex: 1;
          padding-right: 10px;
        }
        
        /* ============ جدول الوجبات ============ */
        .meals-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          font-size: 12px;
        }
        
        .meals-table th {
          background: #2c3e50;
          color: white;
          padding: 8px 4px;
          text-align: center;
          border: 1px solid #444;
          font-weight: bold;
          font-size: 11px;
        }
        
        .meals-table td {
          padding: 6px 4px;
          border: 1px solid #ccc;
          text-align: center;
          vertical-align: middle;
        }
        
        .meal-name {
          text-align: right;
          padding-right: 8px;
        }
        
        .meal-qty, .meal-price, .meal-total {
          font-weight: 500;
          white-space: nowrap;
        }
        
        .meals-table tr:nth-child(even) {
          background: #f5f5f5;
        }
        
        .meals-total-row {
          background: #e8f5e8 !important;
          font-weight: bold;
          border-top: 2px solid #27ae60;
        }
        
        /* ============ قسم المدفوعات ============ */
        .payment-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px 15px;
        }
        
        .payment-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          min-height: 26px;
          padding: 4px 0;
          border-bottom: 1px dashed #ddd;
        }
        
        .payment-label {
          color: #555;
          font-weight: bold;
          font-size: 12px;
          white-space: nowrap;
        }
        
        .payment-value {
          color: #222;
          font-weight: 600;
          font-size: 13px;
          text-align: left;
        }
        
        .payment-total {
          background: #e8f5e8;
          padding: 8px 10px;
          border-radius: 4px;
          border: 1px solid #27ae60;
          margin-top: 8px;
          font-size: 14px;
        }
        
        .payment-paid {
          color: #27ae60;
        }
        
        .payment-remaining {
          color: #e74c3c;
        }
        
        /* ============ الملاحظات ============ */
        .notes-box {
          background: #fff9e6;
          padding: 10px;
          border-radius: 4px;
          border-right: 3px solid #f39c12;
          margin-top: 8px;
          font-size: 12px;
          line-height: 1.4;
        }
        
        /* ============ الفوتر ============ */
        .receipt-footer {
          text-align: center;
          margin-top: 25px;
          padding-top: 15px;
          border-top: 1px solid #ccc;
          color: #666;
          font-size: 11px;
        }
        
        .footer-info {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
          font-size: 10px;
          color: #888;
        }
        
        /* ============ أزرار التحكم ============ */
        .controls {
          text-align: center;
          margin-top: 20px;
          padding: 15px;
        }
        
        .print-btn {
          background: #9b59b6;
          color: white;
          border: none;
          padding: 10px 20px;
          font-size: 14px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
        }
        
        /* ============ محاذاة ============ */
        .text-right {
          text-align: right !important;
        }
        
        .text-left {
          text-align: left !important;
        }
        
        .text-center {
          text-align: center !important;
        }
        
        /* ============ هامش أضافي للطباعة ============ */
        @media print {
          .section {
            break-inside: avoid;
          }
          
          .meals-table {
            break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <!-- ترويسة الفاتورة -->
      <div class="receipt-header">
        <div class="restaurant-name">Fleet Club</div>
        <div class="receipt-title">إيصال حجز</div>
        <div class="booking-meta">
          <span>حجز رقم: <strong>${booking.bookingId || '---'}</strong></span>
          <span>${currentDate} - ${currentTime}</span>
        </div>
      </div>
      
      <!-- معلومات العميل -->
      <div class="section">
        <div class="section-title">👤 معلومات العميل</div>
        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">اسم العميل:</span>
            <span class="info-value">${booking.clientName || '---'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">رقم الهاتف:</span>
            <span class="info-value">${booking.clientPhone || '---'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">عدد الضيوف:</span>
            <span class="info-value">${booking.guestsCount || 0} شخص</span>
          </div>
          <div class="info-row">
            <span class="info-label">رقم الإيصال:</span>
            <span class="info-value">${booking.receiptNumber || '---'}</span>
          </div>
        </div>
      </div>
      
      <!-- تفاصيل الحجز -->
      <div class="section">
        <div class="section-title">📅 تفاصيل الحجز</div>
        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">التاريخ:</span>
            <span class="info-value">${formattedDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">الوقت:</span>
            <span class="info-value">${time}</span>
          </div>
          <div class="info-row">
            <span class="info-label">المكان:</span>
            <span class="info-value">${this.getVenueName(booking.venueId)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">نوع الحجز:</span>
            <span class="info-value">${this.getBookingTypeText(booking.bookingType)}</span>
          </div>
        </div>
      </div>
      
      <!-- الوجبات المطلوبة -->
      <div class="section">
        <div class="section-title">🍽️ الوجبات المطلوبة</div>
        <table class="meals-table">
          <thead>
            <tr>
              <th width="35">#</th>
              <th>اسم الوجبة</th>
              <th width="50">الكمية</th>
              <th width="70">السعر</th>
              <th width="80">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${mealsRows || `
            <tr>
              <td colspan="5" class="text-center" style="padding: 15px; color: #95a5a6; font-style: italic;">
                لا توجد وجبات مضافة
              </td>
            </tr>
            `}
          </tbody>
        </table>
        
        <div style="margin-top: 10px; text-align: left; font-weight: bold; font-size: 13px;">
          إجمالي الوجبات: <span style="color: #2c3e50;">${mealsTotal.toLocaleString('ar-EG')} ج.م</span>
        </div>
      </div>
      
      <!-- المدفوعات -->
      <div class="section">
        <div class="section-title">💰 المدفوعات</div>
        <div class="payment-grid">
          <div class="payment-row">
            <span class="payment-label">إجمالي الفاتورة:</span>
            <span class="payment-value">${mealsTotal.toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div class="payment-row">
            <span class="payment-label">المبلغ المدفوع:</span>
            <span class="payment-value payment-paid">${(booking.depositAmount || 0).toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div class="payment-total payment-row">
            <span class="payment-label">المبلغ المتبقي:</span>
            <span class="payment-value payment-remaining">${remaining.toLocaleString('ar-EG')} ج.م</span>
          </div>
        </div>
      </div>
      
      <!-- الملاحظات -->
      ${booking.note ? `
      <div class="section">
        <div class="section-title">📝 ملاحظات</div>
        <div class="notes-box">
          ${booking.note}
        </div>
      </div>
      ` : ''}
      
      <!-- توقيع العميل -->
      <div class="section">
        <div class="section-title">✍️ توقيع العميل</div>
        <div style="text-align: center; padding: 20px 0; margin-top: 10px;">
          <div style="width: 70%; height: 1px; background: #333; margin: 0 auto 5px;"></div>
          <div style="font-size: 11px; color: #666;">توقيع العميل وتأكيد الاستلام</div>
        </div>
      </div>
      
      <!-- الفوتر -->
      <div class="receipt-footer">
        <p>شكراً لاختياركم Fleet Club - نتمنى لكم وجبة شهية</p>
        <div class="footer-info">
          <span>📞 للاستفسار: 01092209699</span>
          <span>⏰ أوقات العمل: 10 ص - 12 م</span>
        </div>
      </div>
      
      <!-- أزرار التحكم -->
      <div class="controls no-print">
        <button class="print-btn" onclick="window.print()">🖨️ طباعة الفاتورة</button>
      </div>
      
      <script>
        window.onload = function() {
          // للطباعة التلقائية
          // setTimeout(() => window.print(), 500);
        };
      </script>
    </body>
    </html>
  `;
}



getStatusText(status: number | string): string {
  switch (status) {
    case 0: return 'قيد الانتظار';
    case 1: return 'مؤكد';
    case 2: return 'ملغي';
    case 3: return 'مؤجل';
    default: return 'غير معروف';
  }
}
  // ==================== APPLY FILTERS ====================
applyFilters(): void {
  let result = [...this.bookings];

  // نوع الحجز
  if (this.filterType !== 'all') {
    result = result.filter(b => b.bookingType === this.filterType);
  }

  // المكان
  if (this.filterVenue !== 'all') {
    result = result.filter(b => b.venueId === this.filterVenue);
  }

  // الحالة ✅
  if (this.filterStatus !== 'all') {
    result = result.filter(b => b.bookingStatus === this.filterStatus);
  }

  // التاريخ
  if (this.filterDate) {
    result = result.filter(b => {
      const datePart = b.bookingDate?.split('T')[0];
      return datePart === this.filterDate;
    });
  }

  this.filteredBookings = result;
  this.calculateStatistics();
}

  // ==================== CALCULATE STATISTICS ====================
  calculateStatistics(): void {
    this.totalBookings = this.filteredBookings.length;
    this.totalGuests = this.filteredBookings.reduce((sum, b) => sum + (b.guestsCount || 0), 0);
    this.totalAmount = this.filteredBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    this.totalDeposit = this.filteredBookings.reduce((sum, b) => sum + (b.depositAmount || 0), 0);
    this.totalRemaining = this.totalAmount - this.totalDeposit;
  }

  // ==================== PRINT FUNCTIONS ====================
printReport(): void {
  if (!this.filteredBookings.length) {
    this.toastr.warning('لا توجد حجوزات للطباعة');
    return;
  }

  switch(this.activeTemplate) {
    case 'customer': this.printCustomerReceipt(); break;
    case 'station': this.printStationReport(); break;
    case 'kitchen': this.printKitchenReport(); break;
    case 'financial': this.printFinancialReport(); break;
    case 'compact': this.printCompactReport(); break;
  }
}


  // ==================== GENERATE PRINT CONTENT ====================

  /**
   * 1️⃣ طباعة محطة التوزيع - للموظفين
   */
 generateStationContent(bookings: any[], title: string): string {

   const TAX_RATE = environment.TAX_RATE; // ✅ نسبة الضريبة
  const sortedBookings = [...bookings].sort((a, b) => {
    return new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime();
  });

  const currentDate = new Date().toLocaleDateString('ar-EG');
  let bookingCards = '';

  sortedBookings.forEach((booking, index) => {

    const bookingDate = new Date(booking.bookingDate);
    const formattedDate = bookingDate.toLocaleDateString('ar-EG');
    const time = this.formatTime(booking.bookingTime);

    // ================= الحسابات =================
    let mealsTotal = 0;
    let taxAmount = 0;
    let totalWithTax = 0;
    let mealsTable = '';

    if (booking.meals && booking.meals.length > 0) {

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

    } else {
      mealsTable = '<span class="no-meals">لا توجد وجبات</span>';
      mealsTotal = booking.totalAmount || 0;
    }

    taxAmount = mealsTotal * TAX_RATE;
    totalWithTax = mealsTotal + taxAmount;

    const paid = booking.depositAmount || booking.paidAmount || 0;
    const remaining = totalWithTax - paid;

    // ================= الكارت =================
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

          <!-- المدفوعات -->
          <div class="payment-row">
            <div class="payment-item">
              <span class="payment-label">الإجمالي:</span>
              <span class="payment-value">${mealsTotal.toLocaleString('ar-EG')} ج.م</span>
            </div>

            <div class="payment-item">
              <span class="payment-label">الضريبة (12%):</span>
              <span class="payment-value">${taxAmount.toLocaleString('ar-EG')} ج.م</span>
            </div>

            <div class="payment-item">
              <span class="payment-label">المدفوع:</span>
              <span class="payment-value paid">${paid.toLocaleString('ar-EG')} ج.م</span>
            </div>

            <div class="payment-item">
              <span class="payment-label">المتبقي:</span>
              <span class="payment-value remaining">${remaining.toLocaleString('ar-EG')} ج.م</span>
            </div>
          </div>

          ${booking.note || booking.notes ? `
          <div class="notes-row">
            <span class="notes-label">ملاحظات:</span>
            <span class="notes-text">${booking.note || booking.notes || ''}</span>
          </div>
          ` : ''}

        </div>

        <div class="card-separator"></div>
      </div>
    `;
  });

  // ================= الصفحة =================
  return `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${title} - محطات التوزيع</title>
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
      </style>
    </head>
    <body>

      <div class="header">
        <h1>${title}</h1>
        <div class="subtitle">تقرير التوزيع - ${currentDate}</div>
      </div>

      ${bookingCards}

      <div class="controls no-print">
        <button class="print-btn" onclick="window.print()">🖨️ طباعة التقرير</button>
      </div>

      <div class="footer">
        <p>نموذج توزيع - نظام dpBooking</p>
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

  /**
   * 2️⃣ طباعة المطبخ - للطهاة
   */
generateKitchenContent(bookings: any[], title: string, filterDate?: string): string {
  this.updateReportTitle();

  // 🔥 فصل حجوزات المركب عن باقي الحجوزات
  const mainKitchenBookings = bookings.filter(b => b.venueId !== 8);
  const boatKitchenBookings = bookings.filter(b => b.venueId === 8);

  const todayText = new Date().toLocaleDateString('ar-EG');

  // ====== دالة مساعدة لتجميع الوجبات ======
  const buildMealsContent = (bookingsList: any[]) => {
    const sortedBookings = [...bookingsList].sort((a, b) => {
      return new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime();
    });

    let allMeals: any[] = [];
    sortedBookings.forEach((booking, index) => {
      if (booking.meals && booking.meals.length > 0) {
        booking.meals.forEach((meal: any) => {
          allMeals.push({
            bookingNumber: index + 1,
            clientName: booking.clientName,
            mealName: meal.mealName,
            quantity: meal.quantity
          });
        });
      }
    });

    const groupedMeals: any = {};
    allMeals.forEach(meal => {
      const key = meal.mealName;
      if (!groupedMeals[key]) {
        groupedMeals[key] = {
          mealName: meal.mealName,
          totalQuantity: 0,
          bookings: []
        };
      }
      groupedMeals[key].totalQuantity += meal.quantity;
      groupedMeals[key].bookings.push({
        bookingNumber: meal.bookingNumber,
        clientName: meal.clientName,
        quantity: meal.quantity
      });
    });

    let mealsContent = '';
    Object.values(groupedMeals).forEach((meal: any) => {
      mealsContent += `
        <div class="meal-card">
          <div class="meal-header">
            <div class="meal-name">${meal.mealName}</div>
            <div class="meal-total">الكمية: ${meal.totalQuantity}</div>
          </div>
          <div class="meal-bookings">
            ${meal.bookings.map((b: any) => `
              <div class="booking-item">
                <span class="booking-number">#${b.bookingNumber}</span>
                <span class="client-name">${b.clientName}</span>
                <span class="booking-quantity">×${b.quantity}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });

    return mealsContent || `<div style="text-align:center">لا توجد طلبات</div>`;
  };

  // ====== محتوى المطبخ الرئيسي ======
  const mainKitchenContent = buildMealsContent(mainKitchenBookings);

  // ====== محتوى مطبخ المركب ======
  const boatKitchenContent = buildMealsContent(boatKitchenBookings);

  return `
<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  * {
    box-sizing: border-box;
    font-family: Arial, sans-serif;
  }

  body {
    padding: 10mm;
    font-size: 14px;
  }

  @media print {
    @page {
      size: A4;
      margin: 5mm;
    }

    .page-break {
      page-break-after: always;
    }

    .no-print {
      display: none !important;
    }
  }

  .header {
    text-align: center;
    margin-bottom: 20px;
    padding: 15px;
    background: #f39c12;
    color: white;
    border-radius: 10px;
  }

  .boat-header {
    background: #0f766e;
  }

  .meal-card {
    border: 2px solid #ddd;
    border-radius: 8px;
    margin-bottom: 15px;
  }

  .meal-header {
    background: #f8f9fa;
    padding: 10px;
    display: flex;
    justify-content: space-between;
  }

  .meal-name {
    font-weight: bold;
    font-size: 18px;
  }

  .meal-total {
    background: #27ae60;
    color: #fff;
    padding: 4px 12px;
    border-radius: 15px;
  }

  .booking-item {
    display: flex;
    justify-content: space-between;
    padding: 6px;
    border-bottom: 1px dashed #eee;
  }
</style>
</head>

<body>

<!-- ===== المطبخ الرئيسي ===== -->
<div class="header">
  <h1>${title} - المطبخ الرئيسي</h1>
  <div style="font-size:13px">تاريخ الطباعة: ${todayText}</div>
</div>

${mainKitchenContent}

<div class="page-break"></div>

<!-- ===== مطبخ المركب ===== -->
<div class="header boat-header">
  <h1>🛥️ طباعة مطبخ المركب</h1>
  <div style="font-size:13px">تاريخ الطباعة: ${todayText}</div>
</div>

${boatKitchenContent}

<div class="no-print" style="text-align:center;margin-top:20px;">
  <button onclick="window.print()">🖨️ طباعة</button>
</div>

</body>
</html>
`;
}




  /**
   * 3️⃣ طباعة الإدارة - للمالية
   */
generateFinancialContent(bookings: any[], title: string): string {

  const currentDate = new Date().toLocaleDateString('ar-EG');

  const activeBookings = bookings.filter(b => b.bookingStatus === 1);
  const cancelledBookings = bookings.filter(b => b.bookingStatus === 2);
  const postponedBookings = bookings.filter(b => b.bookingStatus === 3);

  const buildRows = (list: any[], icon: string) => {
    if (!list.length) {
      return `
        <tr>
          <td colspan="6" class="text-center empty">لا يوجد بيانات</td>
        </tr>
      `;
    }

    return list.map((b, i) => `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td>${b.clientName || '---'}</td>
        <td class="text-center">${b.clientPhone || '---'}</td>
        <td class="text-center">${b.receiptNumber || '---'}</td>
        <td class="text-center">
          ${(b.depositAmount || 0).toLocaleString('ar-EG')}
        </td>
        <td class="text-center">${icon}</td>
      </tr>
    `).join('');
  };

  return `
<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="UTF-8">
<title>${title}</title>

<style>
* {
  box-sizing: border-box;
  font-family: Arial, sans-serif;
}

body {
  padding: 20px;
  font-size: 12px;
  color: #333;
  background: #fff;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.header h1 {
  font-size: 20px;
}

.subtitle {
  font-size: 12px;
  color: #555;
}

.section {
  margin-top: 25px;
}

.section-title {
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 8px;
  border-right: 4px solid #333;
  padding-right: 8px;
}

.financial-table {
  width: 100%;
  border-collapse: collapse;
}

.financial-table th {
  background: #f1f3f5;
  border: 1px solid #ccc;
  padding: 8px;
  text-align: center;
}

.financial-table td {
  border: 1px solid #ddd;
  padding: 8px;
}

.text-center {
  text-align: center;
}

.empty {
  color: #888;
  font-style: italic;
}

.controls {
  text-align: center;
  margin-top: 25px;
}

.print-btn {
  background: #2c3e50;
  color: white;
  border: none;
  padding: 10px 25px;
  font-size: 14px;
  border-radius: 4px;
  cursor: pointer;
}

@media print {
  .controls {
    display: none;
  }
}
</style>
</head>

<body>

<div class="header">
  <h1>${title}</h1>
  <div class="subtitle">تاريخ الطباعة: ${currentDate}</div>
</div>

<!-- الحجوزات النشطة -->
<div class="section">
  <div class="section-title">✔️ الحجوزات النشطة</div>
  <table class="financial-table">
    <thead>
      <tr>
        <th width="40">م</th>
        <th>اسم العميل</th>
        <th width="120">الهاتف</th>
        <th width="100">رقم الإيصال</th>
        <th width="90">المدفوع</th>
        <th width="70">الحالة</th>
      </tr>
    </thead>
    <tbody>
      ${buildRows(activeBookings, '✔️')}
    </tbody>
  </table>
</div>

<!-- الحجوزات الملغية -->
<div class="section">
  <div class="section-title">⛔ الحجوزات الملغية</div>
  <table class="financial-table">
    <thead>
      <tr>
        <th width="40">م</th>
        <th>اسم العميل</th>
        <th width="120">الهاتف</th>
        <th width="100">رقم الإيصال</th>
        <th width="90">المدفوع</th>
        <th width="70">الحالة</th>
      </tr>
    </thead>
    <tbody>
      ${buildRows(cancelledBookings, '⛔')}
    </tbody>
  </table>
</div>

<!-- الحجوزات المؤجلة -->
<div class="section">
  <div class="section-title">⏳ الحجوزات المؤجلة</div>
  <table class="financial-table">
    <thead>
      <tr>
        <th width="40">م</th>
        <th>اسم العميل</th>
        <th width="120">الهاتف</th>
        <th width="100">رقم الإيصال</th>
        <th width="90">المدفوع</th>
        <th width="70">الحالة</th>
      </tr>
    </thead>
    <tbody>
      ${buildRows(postponedBookings, '⏳')}
    </tbody>
  </table>
</div>

<div class="controls">
  <button class="print-btn" onclick="window.print()">🖨️ طباعة التقرير</button>
</div>

</body>
</html>
`;
}


  /**
   * 4️⃣ طباعة مختصرة - نسخة مبسطة
   */
  generateCompactContent(bookings: any[], title: string): string {
    const sortedBookings = [...bookings].sort((a, b) => {
      return new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime();
    });
    
    const currentDate = new Date().toLocaleDateString('ar-EG');
    
    let listItems = '';
    sortedBookings.forEach((booking, index) => {
      const time = this.formatTime(booking.bookingTime);
      const date = new Date(booking.bookingDate).toLocaleDateString('ar-EG');
      
      listItems += `
        <div class="list-item">
          <div class="item-number">${index + 1}</div>
          <div class="item-content">
            <div class="item-header">
              <span class="client">${booking.clientName || '---'}</span>
              <span class="phone">${booking.clientPhone || '---'}</span>
            </div>
            <div class="item-details">
              <span class="details">${time} | ${this.getVenueName(booking.venueId)} | ${booking.guestsCount} ضيوف</span>
            </div>
          </div>
        </div>
      `;
    });
    
    return `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>${title} - مختصر</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Arial', sans-serif;
          }
          
          body {
            padding: 15mm;
            background: white;
            color: #333;
            font-size: 14px;
          }
          
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            
            body {
              padding: 10mm;
            }
            
            .no-print {
              display: none !important;
            }
          }
          
          .header {
            text-align: center;
            margin-bottom: 25px;
          }
          
          .header h1 {
            font-size: 28px;
            color: #2c3e50;
            margin-bottom: 10px;
          }
          
          .header .date {
            color: #666;
            font-size: 16px;
          }
          
          .list-item {
            display: flex;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px dashed #eee;
          }
          
          .item-number {
            background: #3498db;
            color: white;
            width: 35px;
            height: 35px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            font-weight: bold;
            margin-left: 15px;
          }
          
          .item-content {
            flex: 1;
          }
          
          .item-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          
          .client {
            font-weight: bold;
            font-size: 16px;
          }
          
          .phone {
            color: #666;
            font-size: 14px;
          }
          
          .item-details {
            color: #7f8c8d;
            font-size: 13px;
          }
          
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #eee;
            color: #95a5a6;
            font-size: 12px;
          }
          
          .controls {
            text-align: center;
            margin-top: 25px;
          }
          
          .print-btn {
            background: #2c3e50;
            color: white;
            border: none;
            padding: 12px 30px;
            font-size: 15px;
            border-radius: 5px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <div class="date">${currentDate} - قائمة الحجوزات</div>
        </div>
        
        ${listItems}
        
        <div class="footer">
          <p>إجمالي الحجوزات: ${sortedBookings.length} | إجمالي الضيوف: ${this.totalGuests}</p>
        </div>
        
        <div class="controls no-print">
          <button class="print-btn" onclick="window.print()">🖨️ طباعة القائمة</button>
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

  // ==================== OPEN PRINT WINDOW ====================
  private openPrintWindow(content: string, title: string): void {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    
    if (!printWindow) {
      this.toastr.error('يرجى السماح بالنوافذ المنبثقة');
      return;
    }
    
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
    
    // طباعة تلقائية بعد تحميل الصفحة
    printWindow.onload = () => {
      // يمكنك تفعيل الطباعة التلقائية إذا أردت
      // printWindow.print();
    };
  }



  // ==================== PRINT ACTIONS ====================
  printStationReport(): void {
    const content = this.generateStationContent(this.filteredBookings, this.reportTitle);
    this.openPrintWindow(content, `${this.reportTitle} - محطة التوزيع`);
  }
  
printKitchenReport(): void {
  const content = this.generateKitchenContent(
    this.filteredBookings,
    this.reportTitle,
    this.filterDate   // ✅ التاريخ اللي المستخدم اختاره
  );

  this.openPrintWindow(content, `${this.reportTitle} - المطبخ`);
}

  printFinancialReport(): void {
    const content = this.generateFinancialContent(this.filteredBookings, this.reportTitle);
    this.openPrintWindow(content, `${this.reportTitle} - مالي`);
  }

  printCompactReport(): void {
    const content = this.generateCompactContent(this.filteredBookings, this.reportTitle);
    this.openPrintWindow(content, `${this.reportTitle} - مختصر`);
  }

  // ==================== HELPER METHODS ====================
  updateCurrentTime(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  updateReportTitle(): void {
    let title = 'تقرير ';
    
    if (this.filterType !== 'all') {
      title += this.getBookingTypeTextFromString(this.filterType) + ' ';
    }
    
    if (this.filterDate) {
      const dateObj = new Date(this.filterDate);
      title += `بتاريخ ${dateObj.toLocaleDateString('ar-EG')} `;
    }
    
    this.reportTitle = title.trim();
  }

  getVenueName(venueId?: number): string {
    if (!venueId) return 'غير محدد';
    const venue = this.venues.find(v => v.venueId === venueId || v.id === venueId);
    return venue ? venue.venueName || venue.name || '-' : '-';
  }

  getBookingTypeTextFromString(typeString: string | number): string {
    if (typeof typeString === 'number') {
      return this.getBookingTypeText(typeString);
    }
    
    switch(typeString) {
      case 'RamadanIftar': return 'إفطار رمضان';
      case 'RamadanSuhoor': return 'سحور رمضان';
      default: return typeString || 'غير محدد';
    }
  }

  getBookingTypeText(type: BookingType): string {
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

  formatTime(timeStr: string): string {
    if (!timeStr) return '--:--';
    return timeStr.substring(0, 5);
  }

  loadVenues(): void {
    this.venueService.getAll().subscribe({
      next: (res) => {
        this.venues = res;
      },
      error: () => console.error('فشل تحميل الأماكن')
    });
  }

parseRouteParams(): void {
  this.route.queryParams.subscribe(params => {

    // ✅ نوع الحجز
    const typeParam = params['type'];
    if (typeParam === 'iftar') {
      this.filterType = 5;
    } else if (typeParam === 'suhur') {
      this.filterType = 6;
    } else {
      this.filterType = 'all';
    }

    // ✅ التاريخ
    this.filterDate =
      params['date'] || new Date().toISOString().split('T')[0];

    // ✅ الحالة
    this.filterStatus =
      params['status'] !== undefined
        ? Number(params['status'])
        : 'all';

    this.updateReportTitle();
    this.applyFilters();
  });
}


  loadMeals(): void {
    this.mealService.getAllMeals().subscribe({
      next: (data) => {
        this.mealsList = data;
      },
      error: (err) => {
        console.error('Error loading meals:', err);
      }
    });
  }

  // ==================== FILTER CHANGES ====================
 changeType(value: any) {
  this.filterType = value === 'all' ? 'all' : Number(value);
  this.applyFilters();
}

  changeDate(date: string): void {
    this.filterDate = date;
     this.updateReportTitle();
    this.applyFilters();
  }

 changeStatus(value: any) {
  this.filterStatus = value === 'all' ? 'all' : Number(value);
  this.applyFilters();
}

changeVenue(value: any) {
  this.filterVenue = value === 'all' ? 'all' : Number(value);
  this.applyFilters();
}
  changeTemplate(templateId: string): void {
    this.activeTemplate = templateId;
  }

  goBack(): void {
    this.router.navigate(['/bookings']);
  }
  getTemplateDescription(templateId: string): string {
  switch(templateId) {

    case 'customer':
      return 'فورم العميل - إيصال رسمي مع تفاصيل لتأكيد الحجز';

    case 'station':
      return 'للإدارة والتوزيع - يحتوي على اسم العميل، الهاتف، المكان، والوجبات';
    case 'kitchen':
      return 'للمطبخ - يظهر الوجبات المطلوبة مع الكميات فقط';
    case 'financial':
      return 'للمالية ';
    case 'compact':
      return 'البوابة     ';
    default:
      return 'حدد نوع الطباعة';
  }
}

getTemplateName(templateId: string): string {
  const template = this.printTemplates.find(t => t.id === templateId);
  return template ? template.name : 'تقرير';
}

getStatusClass(status: BookingStatus): string {
  switch(status) {
    case BookingStatus.Pending: return 'badge-pending';
    case BookingStatus.Confirmed: return 'badge-confirmed';
    case BookingStatus.Cancelled: return 'badge-cancelled';
    case BookingStatus.Postponed: return 'badge-completed';
    default: return '';
  }
}
}