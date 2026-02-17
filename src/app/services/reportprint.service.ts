import { Injectable } from '@angular/core';
import { BookingService, BookingType } from './booking.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';
import { VenueService } from './venue.service';

@Injectable({
  providedIn: 'root',
})
export class ReportprintService {
  private TAX_RATE = environment.TAX_RATE || 0.12;

  venues: any[] = [];
  constructor(
    private bookingService: BookingService,
    private toastr: ToastrService,
        private venueService: VenueService,
    
  ) {this.loadVenues()}

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
   getVenueName(venueId?: number): string {
    if (!venueId) return '-';

    // انتبه للحقل الصحيح من الـ backend
    const venue = this.venues.find(
      (v) => v.venueId === venueId || v.id === venueId,
    );
    return venue ? venue.venueName || venue.name || '-' : '-';
  }
    loadVenues(): void {
    this.venueService.getAll().subscribe({
      next: (res) => {
        this.venues = res; // خليها كلها
      },
      error: () => console.error('فشل تحميل الأماكن'),
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
  
  @media print { 
    @page { size: A4 portrait; margin: 0mm; } 
    body { background: white !important; padding: 0; min-height: auto; margin: 0; } 
    .receipt-container { box-shadow: none !important; margin: 0 !important; width: 210mm !important; min-height: 297mm !important; border-radius: 0 !important; display: flex; flex-direction: column; } 
    .no-print, .print-btn { display: none !important; }
    .content { flex: 1 0 auto; }
    .footer-container { flex-shrink: 0; margin-top: auto; }
  }
  
  .receipt-container { 
    width: 210mm; 
    min-height: 297mm; 
    background: white; 
    border-radius: 8px; 
    overflow: hidden; 
    position: relative; 
    box-shadow: 0 10px 40px rgba(0,0,0,0.3); 
    margin: 0 auto; 
    display: flex;
    flex-direction: column;
  }
  
  .header { 
    background: linear-gradient(135deg, #28225c 0%, #1a1740 100%); 
    color: white; 
    padding: 12px 18px; 
    position: relative; 
    overflow: hidden; 
    min-height: 95px; 
    flex-shrink: 0;
  }
  
  .header::before { 
    content: ''; 
    position: absolute; 
    top: -30px; 
    right: -20px; 
    width: 100px; 
    height: 100px; 
    background: linear-gradient(135deg, #faaf3a 0%, rgba(250,175,58,0.2) 100%); 
    border-radius: 50%; 
    opacity: 0.3; 
  }
  
  .restaurant-name { 
    font-size: 24px; 
    font-weight: 800; 
    letter-spacing: -0.5px; 
    margin-bottom: 2px; 
    position: relative; 
    z-index: 2; 
    color: #faaf3a; 
    text-align: center; 
  }
  
  .receipt-title { 
    font-size: 15px; 
    color: rgba(255,255,255,0.9); 
    margin-bottom: 6px; 
    font-weight: 400; 
    position: relative; 
    z-index: 2; 
    text-align: center; 
  }
  
  .booking-meta { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    margin-top: 8px; 
    padding: 8px 12px; 
    background: rgba(250,175,58,0.15); 
    border-radius: 8px; 
    font-size: 12px; 
    border: 1px solid rgba(250,175,58,0.3); 
    position: relative; 
    z-index: 2; 
  }
  
  .booking-id { 
    background: #faaf3a; 
    color: #28225c; 
    padding: 4px 12px; 
    border-radius: 15px; 
    font-weight: 700; 
    font-size: 13px; 
    box-shadow: 0 3px 8px rgba(250,175,58,0.4); 
  }
  
  .booking-date { 
    display: flex; 
    align-items: center; 
    gap: 6px; 
    color: rgba(255,255,255,0.9); 
    font-size: 12px; 
  }
  
  .content { 
    padding: 12px 18px; 
    flex: 1 0 auto;
  }
  
  .section { 
    margin-bottom: 12px; 
    padding: 12px 14px; 
    border: 1px solid #e8eaf6; 
    border-radius: 6px; 
    background: white; 
    position: relative; 
    box-shadow: 0 2px 6px rgba(0,0,0,0.02); 
  }
  
  .section-title { 
    font-size: 14px; 
    color: #28225c; 
    margin-bottom: 10px; 
    padding-bottom: 5px; 
    border-bottom: 1px solid #e8eaf6; 
    font-weight: 700; 
    display: flex; 
    align-items: center; 
    gap: 6px; 
  }
  
  .section-title::before { 
    content: ''; 
    width: 4px; 
    height: 16px; 
    background: linear-gradient(135deg, #28225c, #faaf3a); 
    border-radius: 2px; 
  }
  
  .info-grid { 
    display: grid; 
    grid-template-columns: repeat(2, 1fr); 
    gap: 6px 12px; 
  }
  
  .info-row { 
    display: flex; 
    justify-content: space-between; 
    align-items: baseline; 
    min-height: 20px; 
    padding: 2px 0; 
    position: relative; 
  }
  
  .info-row::after { 
    content: ''; 
    position: absolute; 
    bottom: 0; 
    right: 0; 
    width: 100%; 
    height: 1px; 
    background: linear-gradient(90deg, transparent, #f0f0f0, transparent); 
  }
  
  /* ✅ تقريب الداتا من اسم الفيلد */
  .info-label { 
    color: #666; 
    font-weight: 500; 
    font-size: 12px; 
    white-space: nowrap;
    margin-left: 2px; /* تقليل المسافة */
  }
  
  .info-value { 
    color: #28225c; 
    font-weight: 600; 
    font-size: 12.5px; 
    text-align: left; 
    margin-right: 0; /* إزالة المسافة الزائدة */
    padding-right: 0;
    flex: 1; /* يسمح للقيمة بأخذ المساحة المتبقية */
  }
  
  .meals-table { 
    width: 100%; 
    border-collapse: collapse; 
    margin-top: 5px; 
    font-size: 11.5px; 
  }
  
  .meals-table thead { 
    background: linear-gradient(135deg, #28225c 0%, #1a1740 100%); 
  }
  
  .meals-table th { 
    color: white; 
    padding: 8px 4px; 
    text-align: center; 
    font-weight: 500; 
    font-size: 11.5px; 
    border: 1px solid rgba(255,255,255,0.1); 
  }
  
  .meals-table td { 
    padding: 8px 4px; 
    border: 1px solid #f0f0f0; 
    text-align: center; 
    vertical-align: middle; 
    font-size: 11.5px; 
  }
  
  .meals-table tbody tr:nth-child(even) { 
    background: #fafafa; 
  }
  
  .payment-grid { 
    display: grid; 
    grid-template-columns: repeat(2, 1fr); 
    gap: 6px 10px; 
    margin-top: 3px; 
  }
  
  .payment-row { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    min-height: 24px; 
    padding: 5px 8px; 
    border-radius: 5px; 
    background: #f9f9f9; 
    border: 1px solid #e8e8e8; 
    font-size: 12px; 
  }
  
  .payment-label { 
    color: #555; 
    font-weight: 500; 
    font-size: 12px; 
  }
  
  .payment-value { 
    color: #28225c; 
    font-weight: 700; 
    font-size: 12.5px; 
  }
  
  .payment-total { 
    background: linear-gradient(135deg, #28225c 0%, #1a1740 100%); 
    border: none; 
    color: white; 
    grid-column: span 2; 
    margin-top: 3px; 
    padding: 7px 8px; 
  }
  
  .payment-total .payment-label, 
  .payment-total .payment-value { 
    color: white; 
    font-size: 13px; 
  }
  
  .payment-paid { 
    background: #f0f9f0; 
    border-color: #c0e0c0; 
  }
  
  .payment-paid .payment-value { 
    color: #2e7d32; 
  }
  
  .payment-remaining { 
    background: #fff0f0; 
    border-color: #ffc0c0; 
  }
  
  .payment-remaining .payment-value { 
    color: #c62828; 
  }
  
  .alert-box { 
    background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%); 
    padding: 10px; 
    border-radius: 6px; 
    border-right: 3px solid #faaf3a; 
    margin: 10px 0; 
    font-size: 11.5px; 
    line-height: 1.4; 
    color: #5d4037; 
    position: relative; 
  }
  
  .notes-box { 
    background: #f5f5ff; 
    padding: 10px; 
    border-radius: 6px; 
    margin-top: 5px; 
    font-size: 12px; 
    line-height: 1.5; 
    color: #28225c; 
    border: 1px solid #d8d8ff; 
  }
  
  .footer-container {
    flex-shrink: 0;
    margin-top: auto;
    background: white;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  .footer { 
    text-align: center; 
    padding: 12px 18px 8px; 
    position: relative; 
    color: #666; 
  }
  
  .footer::before { 
    content: ''; 
    position: absolute; 
    top: 0; 
    right: 50%; 
    transform: translateX(50%); 
    width: 100px; 
    height: 2px; 
    background: linear-gradient(90deg, #28225c, #faaf3a, #28225c); 
    border-radius: 1px; 
  }
  
  .footer p { 
    font-size: 11.5px; 
    margin-bottom: 4px; 
  }
  
  .footer strong { 
    color: #28225c; 
  }
  
  .footer-info { 
    display: flex; 
    justify-content: center; 
    align-items: center; 
    margin-top: 6px; 
    padding: 8px 12px; 
    background: #f9f9f9; 
    border-radius: 6px; 
    font-size: 11px; 
    color: #666; 
    border: 1px solid #e8e8e8; 
  }
  
  .footer-contact { 
    display: flex; 
    align-items: center; 
    gap: 12px; 
  }
  
  .footer-contact span { 
    display: flex; 
    align-items: center; 
    gap: 4px; 
    padding: 3px 6px; 
    background: white; 
    border-radius: 12px; 
    border: 1px solid #e8e8e8; 
    font-size: 11px; 
  }
  
  .controls { 
    text-align: center; 
    margin: 15px auto; 
    padding: 12px; 
    background: #f9f9f9; 
    border-radius: 6px; 
    border: 1px solid #e8e8e8; 
  }
  
  .print-btn { 
    background: linear-gradient(135deg, #28225c 0%, #1a1740 100%); 
    color: white; 
    border: none; 
    padding: 10px 25px; 
    font-size: 12px; 
    border-radius: 40px; 
    cursor: pointer; 
    font-weight: 600; 
    transition: all 0.3s ease; 
    box-shadow: 0 4px 12px rgba(40,34,92,0.3); 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    gap: 6px; 
    margin: 0 auto; 
  }
  
  .print-btn:hover { 
    transform: translateY(-2px); 
    box-shadow: 0 6px 18px rgba(40,34,92,0.4); 
  }
  
  .print-btn::before { 
    content: '🖨️'; 
    font-size: 13px; 
  }
  
  .no-data { 
    text-align: center; 
    padding: 15px; 
    color: #999; 
    font-style: italic; 
    font-size: 11.5px; 
    background: #fafafa; 
    border-radius: 4px; 
    border: 1px dashed #e0e0e0; 
  }

  .created-by { 
    margin-bottom: 4px; 
    padding: 6px; 
    background: #f8f9fa; 
    border-radius: 4px; 
    border: 1px solid #e8e8e8; 
    display: inline-block; 
    font-size: 12px;
  }
  
  /* ✅ تحسين تقارب الداتا من الـ label */
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 5px; /* بدل المسافات الكبيرة */
  }
  
  .info-label {
    flex-shrink: 0; /* منع الـ label من التقلص */
  }
  
  .info-value {
    flex-grow: 1; /* أخذ المساحة المتبقية */
    text-align: left;
    font-weight: 700;
  }
  
  /* ✅ للهواتف */
  @media (max-width: 768px) {
    .info-label { font-size: 11px; }
    .info-value { font-size: 11.5px; }
  }
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
   <div class="footer" style="text-align: center; color: #28225c; font-size: 12px; margin-top: 15px; line-height: 1.4;">
  <div style="margin-bottom: 4px;">
    <span>القائم بالحجـز: </span>
    <span style="font-weight: 600;">${booking.createdByUserName || '---'}</span>
  </div>

  <p style="margin: 4px 0; font-size: 11px;">© جميع الحقوق محفوظة - devpioneer</p>

  <div class="footer-info" style="margin-top: 4px;">
    <div class="footer-contact" style="display: flex; justify-content: center; gap: 8px; font-size: 11px;">
      <span>📞 01092209699</span>
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

  generateStationContent(
    bookings: any[],
    title: string,
    getVenueNameCallback: (venueId?: number) => string,
  ): string {
    const sortedBookings = [...bookings].sort((a, b) => {
      return (
        new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime()
      );
    });

    const currentDate = new Date().toLocaleDateString('ar-EG');
    let bookingCards = '';

    sortedBookings.forEach((booking, index) => {
      const bookingDate = new Date(booking.bookingDate);
      const formattedDate = bookingDate.toLocaleDateString('ar-EG');
      const time = this.formatTime(booking.bookingTime);

      // ================= الحسابات =================
      let mealsTotal = 0;
      let venuePrice = 0;
      let subtotal = 0; // إجمالي الاكل + سعر القاعة
      let totalWithTax = 0; // إجمالي شامل الضريبة
      let mealsTable = '';

      // حساب إجمالي الوجبات
      if (booking.meals && booking.meals.length > 0) {
        mealsTotal = booking.meals.reduce((sum: number, meal: any) => {
          return sum + (meal.quantity || 0) * (meal.unitPrice || 0);
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

      // جلب سعر القاعة إذا كان موجود
      venuePrice = booking.venuePrice || 0;

      // حساب الإجمالي قبل الضريبة (اكل + قاعة)
      subtotal = mealsTotal + venuePrice;

      // حساب الإجمالي شامل الضريبة (يتم تطبيق الضريبة على إجمالي الاكل فقط وليس سعر القاعة)
      // ✅ نفترض أن الضريبة 12% على قيمة الاكل فقط وليس على سعر القاعة
      const taxOnMeals = mealsTotal * this.TAX_RATE;
      totalWithTax = mealsTotal + taxOnMeals + venuePrice;

      const paid = booking.depositAmount || booking.paidAmount || 0;
      const remaining = totalWithTax - paid;

      // ================= استخدام callback لجلب اسم المكان =================
      const venueName = getVenueNameCallback(booking.venueId);

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
                <span class="field-value">${venueName}</span>
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

            <!-- سعر القاعة (إذا كان موجود) -->
            ${
              venuePrice > 0
                ? `
            <div class="info-row">
              <div class="info-field">
                <span class="field-name">سعر القاعة:</span>
                <span class="field-value venue-price">${venuePrice.toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>
            `
                : ''
            }
  
            <!-- المدفوعات - إجمالي شامل الضريبة + سعر القاعة -->
            <div class="payment-row">
              <div class="payment-item total-item">
                <span class="payment-label">إجمالي الوجبات:</span>
                <span class="payment-value">${mealsTotal.toLocaleString('ar-EG')} ج.م</span>
              </div>
              
              ${
                venuePrice > 0
                  ? `
              <div class="payment-item venue-item">
                <span class="payment-label">سعر القاعة:</span>
                <span class="payment-value venue">${venuePrice.toLocaleString('ar-EG')} ج.م</span>
              </div>
              `
                  : ''
              }
              
              <div class="payment-item tax-item">
                <span class="payment-label">الضريبة (${this.TAX_RATE * 100}%):</span>
                <span class="payment-value tax">${taxOnMeals.toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>
            
            <div class="payment-row grand-total-row">
              <div class="payment-item grand-total-item">
                <span class="payment-label">الإجمالي النهائي:</span>
                <span class="payment-value grand-total">${totalWithTax.toLocaleString('ar-EG')} ج.م</span>
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
  
            ${
              booking.note || booking.notes
                ? `
            <div class="notes-row">
              <span class="notes-label">ملاحظات:</span>
              <span class="notes-text">${booking.note || booking.notes || ''}</span>
            </div>
            `
                : ''
            }
  
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
            
            .venue-price {
              color: #8e44ad;
              font-weight: bold;
            }
            
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
            
            .payment-row {
              display: flex;
              justify-content: space-between;
              margin-top: 4px;
              padding: 4px 0;
              gap: 8px;
            }
            
            .payment-item {
              text-align: center;
              flex: 1;
              padding: 4px;
              border-radius: 3px;
            }
            
            .total-item {
              background-color: #e8f4f8;
              border: 1px solid #b8d9e6;
            }
            
            .venue-item {
              background-color: #f4e8f8;
              border: 1px solid #d9b8e6;
            }
            
            .tax-item {
              background-color: #fff4e8;
              border: 1px solid #ffd6b8;
            }
            
            .grand-total-row {
              border-top: 2px solid #2c3e50;
              margin-top: 8px;
              padding-top: 8px;
            }
            
            .grand-total-item {
              background-color: #2c3e50;
              border: 1px solid #1a2632;
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
            
            .payment-value.venue {
              color: #8e44ad;
            }
            
            .payment-value.tax {
              color: #e67e22;
            }
            
            .payment-value.grand-total {
              color: white;
              font-size: 13px;
            }
            
            .payment-value.paid {
              color: #27ae60;
            }
            
            .payment-value.remaining {
              color: #e74c3c;
            }
            
            .grand-total-item .payment-label {
              color: rgba(255,255,255,0.9);
            }
            
            .grand-total-item .payment-value {
              color: white;
            }
            
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
            
            .card-separator {
              height: 1px;
              background: #eee;
              margin: 2px 0;
            }
            
            .footer {
              text-align: center;
              margin-top: 8px;
              padding-top: 4px;
              border-top: 1px solid #ddd;
              color: #666;
              font-size: 9px;
            }
            
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

  openPrintWindow(content: string): void {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
    } else {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
    }
  }

  /**
   * دالة مساعدة لتنسيق الوقت
   */

  // طباعة استف
  /**
   * تقرير المدفوعات مع عرض الوجبات ونوع الحجز - Payment Report with Meals & Booking Type
   * يعرض: معلومات العميل + نوع الحجز + الوجبات + المبلغ المدفوع فقط
   */
  generatePaymentOnlyContent(
    bookings: any[],
    title: string,
    getVenueNameCallback: (venueId?: number) => string,
    getBookingTypeCallback: (type: any) => string, // ✅ كول باك جديد لنوع الحجز
  ): string {
    const sortedBookings = [...bookings].sort((a, b) => {
      return (
        new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime()
      );
    });

    const currentDate = new Date().toLocaleDateString('ar-EG');
    let bookingCards = '';

    sortedBookings.forEach((booking, index) => {
      const bookingDate = new Date(booking.bookingDate);
      const formattedDate = bookingDate.toLocaleDateString('ar-EG');
      const time = this.formatTime(booking.bookingTime);

      // ================= نوع الحجز =================
      const bookingTypeText = getBookingTypeCallback(booking.bookingType);

      // ================= الوجبات =================
      let mealsTable = '';
      let mealsTotal = 0;

      if (booking.meals && booking.meals.length > 0) {
        mealsTotal = booking.meals.reduce((sum: number, meal: any) => {
          return sum + (meal.quantity || 0) * (meal.unitPrice || 0);
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
      }

      // ================= المبلغ المدفوع فقط =================
      const paid = booking.depositAmount || booking.paidAmount || 0;

      // ================= استخدام callback لجلب اسم المكان =================
      const venueName = getVenueNameCallback(booking.venueId);

      // ================= الكارت =================
      bookingCards += `
        <div class="station-card payment-only-card">
          <div class="card-header payment-header">
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
                <span class="field-value">${venueName}</span>
              </div>
            </div>

            <div class="info-row">
              <div class="info-field">
                <span class="field-name">عدد الضيوف:</span>
                <span class="field-value">${booking.guestsCount || booking.numberOfGuests || 0}</span>
              </div>
              <div class="info-field">
                <span class="field-name">التاريخ:</span>
                <span class="field-value">${formattedDate}</span>
              </div>
              <div class="info-field">
                <span class="field-name">الوقت:</span>
                <span class="field-value">${time}</span>
              </div>
            </div>

            <!-- ========== نوع الحجز ========== -->
            <div class="booking-type-row">
              <span class="booking-type-label">نوع الحجز:</span>
              <span class="booking-type-value">${bookingTypeText}</span>
            </div>

            <!-- ========== قسم الوجبات ========== -->
            <div class="meals-section">
              <div class="section-title">
                <span class="title-icon">🍽️</span>
                <span class="title-text">الوجبات المطلوبة</span>
              </div>
              <div class="meals-list">
                ${mealsTable}
              </div>
            </div>

            <!-- ========== المدفوع فقط - بتصميم مميز ========== -->
            <div class="payment-only-row">
              <div class="payment-only-item">
                <span class="payment-only-label">المبلغ المدفوع:</span>
                <span class="payment-only-value">${paid.toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>

            ${
              booking.note || booking.notes
                ? `
            <div class="notes-row">
              <span class="notes-label">ملاحظات:</span>
              <span class="notes-text">${booking.note || booking.notes || ''}</span>
            </div>
            `
                : ''
            }

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
        <title>${title} - تقرير  الاوبريشن    </title>
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
          
          .header {
            text-align: center;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 2px solid #27ae60;
          }
          
          .header h1 {
            font-size: 16px;
            color: #27ae60;
            margin: 2px 0;
          }
          
          .header .subtitle {
            font-size: 10px;
            color: #666;
          }
          
          .station-card {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 6px;
            padding: 4px;
            border-right: 3px solid #27ae60;
          }
          
          .card-header {
            background: #e8f5e9;
            padding: 4px 6px;
            border-radius: 3px;
            margin-bottom: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
          }
          
          .payment-header {
            background: #e8f5e9;
            border-bottom: 1px solid #a5d6a7;
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
          
          /* ===== نوع الحجز ===== */
          .booking-type-row {
            margin-top: 6px;
            margin-bottom: 8px;
            padding: 6px 8px;
            background: #f1f8fe;
            border-radius: 4px;
            border-right: 3px solid #3498db;
            display: flex;
            align-items: center;
          }
          
          .booking-type-label {
            color: #2c3e50;
            font-weight: bold;
            font-size: 10px;
            margin-left: 8px;
          }
          
          .booking-type-value {
            color: #2980b9;
            font-weight: bold;
            font-size: 11px;
            background: white;
            padding: 2px 8px;
            border-radius: 12px;
            border: 1px solid #b8d9e6;
          }
          
          /* ===== قسم الوجبات ===== */
          .meals-section {
            margin-top: 8px;
            margin-bottom: 8px;
            padding: 6px;
            background: #f8f9fa;
            border-radius: 4px;
            border: 1px solid #e9ecef;
          }
          
          .section-title {
            display: flex;
            align-items: center;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 1px solid #dee2e6;
          }
          
          .title-icon {
            font-size: 12px;
            margin-left: 6px;
          }
          
          .title-text {
            font-weight: bold;
            color: #495057;
            font-size: 11px;
          }
          
          .meals-table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .meals-table tr {
            border-bottom: 1px dashed #dee2e6;
          }
          
          .meals-table tr:last-child {
            border-bottom: none;
          }
          
          .meal-name {
            padding: 4px 2px;
            color: #2c3e50;
            font-size: 10px;
          }
          
          .meal-qty {
            padding: 4px 2px;
            color: #27ae60;
            font-weight: bold;
            font-size: 10px;
            text-align: left;
          }
          
          .no-meals {
            display: block;
            text-align: center;
            padding: 8px;
            color: #95a5a6;
            font-style: italic;
            font-size: 10px;
            background: #fff;
            border-radius: 4px;
          }
          
          /* ===== قسم المدفوعات ===== */
          .payment-only-row {
            display: flex;
            justify-content: flex-start;
            margin-top: 8px;
            margin-bottom: 4px;
            padding: 8px;
            background: linear-gradient(135deg, #27ae60, #219a52);
            border-radius: 4px;
          }
          
          .payment-only-item {
            text-align: right;
            flex: 0 0 auto;
            padding: 0 10px;
          }
          
          .payment-only-label {
            display: inline-block;
            color: rgba(255,255,255,0.9);
            font-size: 10px;
            margin-left: 8px;
            font-weight: normal;
          }
          
          .payment-only-value {
            display: inline-block;
            color: white;
            font-weight: bold;
            font-size: 14px;
            background: rgba(0,0,0,0.1);
            padding: 2px 8px;
            border-radius: 20px;
          }
          
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
          
          .card-separator {
            height: 1px;
            background: #eee;
            margin: 2px 0;
          }
          
          .footer {
            text-align: center;
            margin-top: 8px;
            padding-top: 4px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 9px;
          }
          
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
          
          .print-btn:hover {
            background: #219a52;
          }
        </style>
      </head>
      <body>

        <div class="header">
          <h1>${title}</h1>
          <div class="subtitle">تقرير المدفوعات - ${currentDate}</div>
        </div>

        ${bookingCards}

        <div class="controls no-print">
          <button class="print-btn" onclick="window.print()">🖨️ طباعة التقرير</button>
        </div>

        <div class="footer">
          <p>تقرير المدفوعات مع نوع الحجز والوجبات - نظام dpBooking</p>
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
}
