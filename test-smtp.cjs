const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "lastupdate0000@gmail.com",
        pass: "hdgh mydi kiji uqsg",
    },
});

const todayStr = new Date().toISOString().split('T')[0];
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 3);
const outStr = tomorrow.toISOString().split('T')[0];

const booking = {
    id: "eb87fb9a-4c22",
    tenant_name: "عبدالرحمن النجار",
    phone: "1000000000",
    start_date: todayStr,
    check_in_time: "11:00",
    end_date: outStr,
    check_out_time: "09:00",
    nights: 3,
    nightly_rate: 1000,
    village_fee: 100,
    fee_type: "INCLUSIVE",
    housekeeping_enabled: true,
    housekeeping_price: 200,
    security_deposit_enabled: true,
    security_deposit: 1500,
    tenant_rating_good: true,
    total_rental_price: 3500,
    deposit_enabled: true,
    deposit_amount: 1000,
    payment_status: 'Unpaid',
    handler_enabled: true,
    handler_name: 'أحمد الإداري',
    handler_phone: '1099887766',
    notes: 'العميل من كبار الشخصيات (VIP). يرجى التنسيق بشكل جيد لتسليم المفتاح.'
};
const unitName = "اسماعيليه - الشاليه الرئيسي";

const buildEmailTemplate = (title, headerColor, booking, unitName) => {
    const isPaid = booking.payment_status === 'Paid';
    const totalRental = booking.total_rental_price || 0;
    const paidAmount = isPaid ? totalRental : (booking.deposit_enabled ? (booking.deposit_amount || 0) : 0);
    const remaining = Math.max(0, totalRental - paidAmount);

    let feeTypeText = 'يتحمل المالك رسوم القرية';
    if (booking.fee_type === 'INCLUSIVE') feeTypeText = 'رسوم القرية شاملة الإيجار';
    else if (booking.fee_type === 'TENANT_PAYS') feeTypeText = 'يتحمل العميل رسوم القرية';

    let housekeepingText = booking.housekeeping_enabled
        ?\`نعم (\${(booking.housekeeping_price || 0).toLocaleString()} جنيه)\` 
        : 'غير مطلوية';

    let securityDepositText = booking.security_deposit_enabled 
        ? \`\${(booking.security_deposit || 0).toLocaleString()} جنيه (يسترد للعميل)\` 
        : 'لا يوجد تأمين';

    let handlerText = booking.handler_enabled 
        ? \`\${booking.handler_name || 'بدون اسم'} - هاتف: \${booking.handler_phone || 'لا يوجد'}\` 
        : 'سيتم التسليم بمعرفة المالك';

    let tenantRating = typeof booking.tenant_rating_good !== 'undefined'
        ? (booking.tenant_rating_good ? 'عميل جيد وموصى به' : 'يوجد تحفظات على العميل')
        : 'عميل جديد (لا يوجد تقييم)';

    let paymentStatusBadge = isPaid 
        ? '<span style="color: #166534; font-weight: bold; background-color: #dcfce7; padding: 4px 8px; border-radius: 4px;">مدفوع بالكامل</span>' 
        : '<span style="color: #991b1b; font-weight: bold; background-color: #fee2e2; padding: 4px 8px; border-radius: 4px;">مقدم فقط / غير مدفوع</span>';

    const hasNotes = booking.notes && booking.notes.trim() !== '';

    let notesHtml = '';
    if (hasNotes) {
        notesHtml = \`
            <div style="background-color: #fef3c7; border: 1px solid #fde68a; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
                <p style="margin: 0 0 5px 0; color: #92400e; font-weight: bold;">ملاحظات هامة إضافية:</p>
                <p style="margin: 0; color: #78350f; font-size: 14px;">\${booking.notes}</p>
            </div>
        \`;
    }

    return \`
    <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background-color: #f9fafb; padding: 20px; margin: 0; color: #1f2937;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 30px;">
            
            <div style="text-align: center; border-bottom: 2px solid \${headerColor}; padding-bottom: 20px; margin-bottom: 20px;">
                <h1 style="color: \${headerColor}; margin: 0; font-size: 24px;">Rental Manager</h1>
                <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0;">إدارة الحجوزات والعقارات</p>
            </div>

            <p style="font-size: 16px; font-weight: bold; margin-bottom: 15px;">مرحباً بك،</p>
            <p style="font-size: 15px; margin-bottom: 25px; line-height: 1.6;">
                نود إعلامك بأن لديك موعد <strong>\${title}</strong> خاص بإحدى وحداتك ليوم غدٍ. 
                قمنا بتجهيز ملخص كامل ببيانات العميل والإحصاءات المالية الخاصة بهذا الحجز لمراجعتها.
            </p>

            <h3 style="background-color: #f3f4f6; padding: 10px; margin: 0 0 15px 0; border-radius: 4px; font-size: 16px;">تفاصيل العميل والوحدة</h3>
            <table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom: 25px; font-size: 14px; border-collapse: collapse;">
                <tr>
                    <td style="border-bottom: 1px solid #e5e7eb; width: 35%; color: #4b5563;">اسم الوحدة</td>
                    <td style="border-bottom: 1px solid #e5e7eb; font-weight: bold;">\${unitName} (\${booking.nights} ليالي)</td>
                </tr>
                <tr>
                    <td style="border-bottom: 1px solid #e5e7eb; color: #4b5563;">اسم العميل</td>
                    <td style="border-bottom: 1px solid #e5e7eb; font-weight: bold;">\${booking.tenant_name || 'غير مدرج'}</td>
                </tr>
                <tr>
                    <td style="border-bottom: 1px solid #e5e7eb; color: #4b5563;">رقم الهاتف</td>
                    <td style="border-bottom: 1px solid #e5e7eb; font-weight: bold;" dir="ltr" align="right">+20 \${booking.phone || '---'}</td>
                </tr>
                <tr>
                    <td style="border-bottom: 1px solid #e5e7eb; color: #4b5563;">وقت الدخول</td>
                    <td style="border-bottom: 1px solid #e5e7eb; font-weight: bold;">\${booking.start_date} (الساعة \${booking.check_in_time || '11:00'})</td>
                </tr>
                <tr>
                    <td style="border-bottom: 1px solid #e5e7eb; color: #4b5563;">وقت الخروج</td>
                    <td style="border-bottom: 1px solid #e5e7eb; font-weight: bold;">\${booking.end_date} (الساعة \${booking.check_out_time || '09:00'})</td>
                </tr>
                <tr>
                    <td style="border-bottom: 1px solid #e5e7eb; color: #4b5563;">التسليم والتنظيف</td>
                    <td style="border-bottom: 1px solid #e5e7eb; font-weight: bold;">مسؤول المفتاح: \${handlerText}<br>خدمة النظافة: \${housekeepingText}</td>
                </tr>
                <tr>
                    <td style="border-bottom: 1px solid #e5e7eb; color: #4b5563;">تقييم العميل</td>
                    <td style="border-bottom: 1px solid #e5e7eb; font-weight: bold;">\${tenantRating}</td>
                </tr>
            </table>

            <h3 style="background-color: #f3f4f6; padding: 10px; margin: 0 0 15px 0; border-radius: 4px; font-size: 16px;">الملخص المالي</h3>
            <table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom: 25px; font-size: 14px; border-collapse: collapse;">
                <tr>
                    <td style="border-bottom: 1px solid #e5e7eb; width: 35%; color: #4b5563;">إيجار الليلة</td>
                    <td style="border-bottom: 1px solid #e5e7eb; font-weight: bold;">\${(booking.nightly_rate || 0).toLocaleString()} جنيه</td>
                </tr>
                <tr>
                    <td style="border-bottom: 1px solid #e5e7eb; color: #4b5563;">رسوم القرية</td>
                    <td style="border-bottom: 1px solid #e5e7eb; font-weight: bold;">\${(booking.village_fee || 0).toLocaleString()} جنيه (\${feeTypeText})</td>
                </tr>
                <tr>
                    <td style="border-bottom: 1px solid #e5e7eb; color: #4b5563;">التأمين</td>
                    <td style="border-bottom: 1px solid #e5e7eb; font-weight: bold;">\${securityDepositText}</td>
                </tr>
                <tr>
                    <td style="border-bottom: 1px solid #e5e7eb; color: #4b5563;">الحالة المالية</td>
                    <td style="border-bottom: 1px solid #e5e7eb;">\${paymentStatusBadge}</td>
                </tr>
                <tr>
                    <td style="border-bottom: 1px solid #e5e7eb; color: #4b5563;">الإجمالي المُستحق</td>
                    <td style="border-bottom: 1px solid #e5e7eb; color: #1f2937; font-weight: bold;">\${totalRental.toLocaleString()} جنيه</td>
                </tr>
                <tr>
                    <td style="border-bottom: 1px solid #e5e7eb; color: #4b5563;">ما تم استلامه</td>
                    <td style="border-bottom: 1px solid #e5e7eb; color: #166534; font-weight: bold;">\${paidAmount.toLocaleString()} جنيه</td>
                </tr>
                <tr>
                    <td style="border-bottom: 1px solid #e5e7eb; color: #4b5563;">المتبقي للتحصيل</td>
                    <td style="border-bottom: 1px solid #e5e7eb; color: #991b1b; font-weight: bold; font-size: 15px;">\${remaining.toLocaleString()} جنيه</td>
                </tr>
            </table>

            \${notesHtml}

            <div style="text-align: center; margin-top: 35px; margin-bottom: 20px;">
                <a href="https://rentalmaneger.vercel.app/#/bookings" target="_blank" style="background-color: \${headerColor}; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">
                    الذهاب إلى صفحة الحجوزات
                </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">يتم إرسال هذا التذكير بشكل آلي من نظام إدارة الممتلكات (Rental Manager).</p>
            </div>
        </div>
    </div>\`;
};

const htmlContent = buildEmailTemplate("دخول عميل مستقبلي", "#2563eb", booking, unitName);

transporter.sendMail({
    from: '"Rental Manager" <lastupdate0000@gmail.com>',
    to: "ahmedaly119@gmail.com",
    subject: "تذكير بموعد حجز غداً: وحدة اسماعيلية - Rental Manager",
    html: htmlContent
}).then(info => {
    console.log("Email sent successfully: " + info.messageId);
}).catch(err => {
    console.error("Failed to send email:", err);
});
