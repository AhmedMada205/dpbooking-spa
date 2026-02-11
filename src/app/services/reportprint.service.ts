import { Injectable } from '@angular/core';
import { BookingService, BookingType } from './booking.service';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class ReportprintService {

  venues: any[] = [];
  constructor(  private bookingService: BookingService,
    private toastr: ToastrService) { }




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
  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // HH:mm
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

    getVenueName(venueId?: number): string {
    if (!venueId) return '-';

    // انتبه للحقل الصحيح من الـ backend
    const venue = this.venues.find(
      (v) => v.venueId === venueId || v.id === venueId,
    );
    return venue ? venue.venueName || venue.name || '-' : '-';
  }




   generateSimplePrintContent(bookings: any[], title: string): string {
      // ترتيب الحجوزات حسب التاريخ
      const sortedBookings = [...bookings].sort((a, b) => {
        return (
          new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime()
        );
      });
  
      // التاريخ الحالي
      const currentDate = new Date().toLocaleDateString('ar-EG');
  
      // إجمالي عدد الضيوف
      const totalGuests = sortedBookings.reduce(
        (sum, booking) => sum + (booking.guestsCount || 0),
        0,
      );
  
      // إنشاء صفوف الجدول
      let tableRows = '';
      sortedBookings.forEach((booking, index) => {
        const bookingDate = new Date(booking.bookingDate);
        const formattedDate = bookingDate.toLocaleDateString('ar-EG');
        const time = this.formatTime(booking.bookingTime);
  
        tableRows += `
        <tr>
          <td>${index + 1}</td>
          <td>${booking.clientName || 'غير محدد'}</td>
          <td>${booking.clientPhone || ''}</td>
          <td>${formattedDate}</td>
          <td>${time}</td>
          <td>${booking.guestsCount || 0}</td>
          <td>${this.getVenueName(booking.venueId)}</td>
          <td>${booking.bookingId || ''}</td>
        </tr>
      `;
      });
  
      return `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            font-size: 18px;
            margin: 20px;
            padding: 0;
            text-align: center;
          }
          
          .header {
            margin-bottom: 30px;
            border-bottom: 3px solid #000;
            padding-bottom: 10px;
          }
          
          .header h1 {
            font-size: 32px;
            margin: 0;
            color: #000;
          }
          
          .header h2 {
            font-size: 24px;
            margin: 10px 0;
            color: #333;
          }
          
          .date {
            font-size: 20px;
            margin: 10px 0;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            border: 2px solid #000;
          }
          
          th {
            background-color: #f0f0f0;
            border: 1px solid #000;
            padding: 12px;
            font-size: 20px;
          }
          
          td {
            border: 1px solid #000;
            padding: 10px;
            font-size: 18px;
          }
          
          .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #000;
            font-size: 16px;
          }
          
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            
            button {
              display: none;
            }
          }
          
          button {
            padding: 12px 24px;
            margin: 10px;
            font-size: 18px;
            cursor: pointer;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
          }
          
          button.close-btn {
            background-color: #6c757d;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <h2>جدول الحجوزات</h2>
          <div class="date">${currentDate}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>م</th>
              <th>اسم العميل</th>
              <th>رقم الهاتف</th>
              <th>التاريخ</th>
              <th>الوقت</th>
              <th>عدد الضيوف</th>
              <th>المكان</th>
              <th>رقم الحجز</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div class="footer">
          <p><strong>إجمالي عدد الحجوزات:</strong> ${sortedBookings.length}</p>
          <p><strong>إجمالي عدد الضيوف:</strong> ${totalGuests}</p>
          <p>نموذج طباعة - يمكن توزيعه على الأقسام</p>
        </div>
        
        <div>
          <button onclick="window.print()">طباعة التقرير</button>
          <button onclick="window.close()" class="close-btn">إغلاق النافذة</button>
        </div>
      </body>
      </html>
    `;
    }
}
