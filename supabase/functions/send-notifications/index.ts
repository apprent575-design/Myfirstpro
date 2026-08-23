import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import nodemailer from "npm:nodemailer@6.9.13";

// Anti-Spam, Clean & Professional HTML Email Template
const buildEmailTemplate = (title: string, headerColor: string, booking: any, unitName: string) => {
    const isPaid = booking.payment_status === 'Paid';
    const totalRental = booking.total_rental_price || 0;
    const paidAmount = isPaid ? totalRental : (booking.deposit_enabled ? (booking.deposit_amount || 0) : 0);
    const remaining = Math.max(0, totalRental - paidAmount);

    let feeTypeText = 'يتحمل المالك رسوم القرية';
    if (booking.fee_type === 'INCLUSIVE') feeTypeText = 'الايجار يشمل رسوم القريه';
    else if (booking.fee_type === 'TENANT_PAYS') feeTypeText = 'يتحمل العميل رسوم القرية';

    let housekeepingText = booking.housekeeping_enabled
        ? `مطلوبة (${(booking.housekeeping_price || 0).toLocaleString()} ج.م)`
        : 'غير مطلوبة';

    let securityDepositText = booking.security_deposit_enabled
        ? `${(booking.security_deposit || 0).toLocaleString()} ج.م (تأمين مسترد)`
        : 'لا يوجد تأمين';

    let handlerText = booking.handler_enabled
        ? `${booking.handler_name || 'بدون اسم'} - هاتف: ${booking.handler_phone || 'لا يوجد'}`
        : 'سيتم التسليم بمعرفة المالك';

    let tenantRating = typeof booking.tenant_rating_good !== 'undefined'
        ? (booking.tenant_rating_good ? 'عميل موثوق وموصى به' : 'يوجد تحفظات سابقة على العميل')
        : 'عميل جديد (لا يتوفر تقييم)';

    let paymentStatusBadge = isPaid
        ? '<span style="color: #047857; font-weight: bold; background-color: #d1fae5; padding: 4px 12px; border-radius: 20px; font-size: 13px;">مدفوع بالكامل</span>'
        : '<span style="color: #b91c1c; font-weight: bold; background-color: #fee2e2; padding: 4px 12px; border-radius: 20px; font-size: 13px;">مقدم فقط / مستحق الدفع</span>';

    const hasNotes = booking.notes && booking.notes.trim() !== '';

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إشعار حجز - Rental Manager</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fc; margin: 0; padding: 40px 10px; direction: rtl; text-align: right; color: #1a1a1a;">
    
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table width="100%" max-width="650" cellpadding="0" cellspacing="0" border="0" style="max-width: 650px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04); border: 1px solid #edf2f7;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 50px 40px 40px 40px; text-align: center; border-bottom: 1px solid #edf2f7;">
                            <h1 style="color: #000000; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Rental Manager</h1>
                            <p style="color: #718096; font-size: 15px; margin: 8px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Booking Voucher</p>
                        </td>
                    </tr>

                    <!-- Intro -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <h2 style="margin: 0 0 8px 0; color: #1a202c; font-size: 20px; font-weight: 700;">مرحباً،</h2>
                            <p style="margin: 0; color: #4a5568; font-size: 15px; line-height: 1.7;">
                                هذا إشعار آلي بخصوص <strong style="color: ${headerColor};">${title}</strong> غداً. تجد أدناه كافة التفاصيل الخاصة بالحجز.
                            </p>
                        </td>
                    </tr>

                    <!-- Details Section -->
                    <tr>
                        <td style="padding: 10px 40px 20px 40px;">
                            
                            <!-- Section Title -->
                            <h3 style="margin: 0 0 20px 0; color: #1a202c; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #edf2f7; padding-bottom: 10px;">
                                تفاصيل العميل والوحدة
                            </h3>
                            
                            <table width="100%" cellpadding="12" cellspacing="0" border="0" style="font-size: 15px;">
                                <tr>
                                    <td style="color: #718096; width: 35%; border-bottom: 1px solid #f7fafc;">الوحدة</td>
                                    <td style="color: #1a202c; font-weight: 600; border-bottom: 1px solid #f7fafc;">${unitName} <span style="color: #a0aec0; font-size: 13px; font-weight: normal; margin-right: 6px;">(${booking.nights} ليالي)</span></td>
                                </tr>
                                <tr>
                                    <td style="color: #718096; border-bottom: 1px solid #f7fafc;">اسم العميل</td>
                                    <td style="color: #1a202c; font-weight: 600; border-bottom: 1px solid #f7fafc;">${booking.tenant_name || 'غير محدد'}</td>
                                </tr>
                                <tr>
                                    <td style="color: #718096; border-bottom: 1px solid #f7fafc;">رقم الهاتف</td>
                                    <td style="color: #1a202c; font-weight: 600; border-bottom: 1px solid #f7fafc;" dir="ltr" align="right">+20 ${booking.phone || '---'}</td>
                                </tr>
                                <tr>
                                    <td style="color: #718096; border-bottom: 1px solid #f7fafc;">تاريخ الدخول</td>
                                    <td style="color: #1a202c; border-bottom: 1px solid #f7fafc; font-weight: 600;">${booking.start_date} <span style="color: #718096; font-size: 13px; margin-right: 6px; font-weight: normal;">(الساعة ${booking.check_in_time || '11:00'})</span></td>
                                </tr>
                                <tr>
                                    <td style="color: #718096; border-bottom: 1px solid #f7fafc;">تاريخ الخروج</td>
                                    <td style="color: #1a202c; border-bottom: 1px solid #f7fafc; font-weight: 600;">${booking.end_date} <span style="color: #718096; font-size: 13px; margin-right: 6px; font-weight: normal;">(الساعة ${booking.check_out_time || '09:00'})</span></td>
                                </tr>
                                <tr>
                                    <td style="color: #718096; border-bottom: 1px solid #f7fafc;">مسؤول التسليم</td>
                                    <td style="color: #1a202c; border-bottom: 1px solid #f7fafc; font-weight: 600;">${handlerText}</td>
                                </tr>
                                <tr>
                                    <td style="color: #718096; border-bottom: 1px solid #f7fafc;">النظافة</td>
                                    <td style="color: #1a202c; border-bottom: 1px solid #f7fafc; font-weight: 600;">${housekeepingText}</td>
                                </tr>
                                <tr>
                                    <td style="color: #718096; padding-top: 12px;">تقييم العميل</td>
                                    <td style="color: #1a202c; padding-top: 12px; font-weight: 600;">${tenantRating}</td>
                                </tr>
                            </table>

                            <!-- Section Title -->
                            <h3 style="margin: 40px 0 20px 0; color: #1a202c; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #edf2f7; padding-bottom: 10px;">
                                الملخص المالي
                            </h3>
                            
                            <table width="100%" cellpadding="12" cellspacing="0" border="0" style="font-size: 15px;">
                                <tr>
                                    <td style="color: #718096; width: 35%; border-bottom: 1px solid #f7fafc;">سعر الليلة</td>
                                    <td style="color: #1a202c; font-weight: 600; text-align: left; border-bottom: 1px solid #f7fafc;">${(booking.nightly_rate || 0).toLocaleString()} ج.م</td>
                                </tr>
                                <tr>
                                    <td style="color: #718096; border-bottom: 1px solid #f7fafc;">رسوم القرية</td>
                                    <td style="color: #1a202c; font-weight: 600; text-align: left; border-bottom: 1px solid #f7fafc;">${(booking.village_fee || 0).toLocaleString()} ج.م <br><span style="font-size: 12px; color: #a0aec0; font-weight: normal;">(${feeTypeText})</span></td>
                                </tr>
                                <tr>
                                    <td style="color: #718096; border-bottom: 1px solid #f7fafc;">التأمين النقدي</td>
                                    <td style="color: #1a202c; text-align: left; border-bottom: 1px solid #f7fafc; font-weight: 600;">${securityDepositText}</td>
                                </tr>
                                <tr>
                                    <td style="color: #718096; border-bottom: 1px dashed #cbd5e0;">حالة الدفع</td>
                                    <td style="text-align: left; border-bottom: 1px dashed #cbd5e0;">${paymentStatusBadge}</td>
                                </tr>
                                <tr>
                                    <td style="color: #1a202c; font-weight: 700; font-size: 16px; padding-top: 20px; border-bottom: 1px solid #f7fafc;">الإجمالي الكلي</td>
                                    <td style="color: #1a202c; font-weight: 700; font-size: 16px; text-align: left; padding-top: 20px; border-bottom: 1px solid #f7fafc;">${totalRental.toLocaleString()} ج.م</td>
                                </tr>
                                <tr>
                                    <td style="color: #718096; border-bottom: 1px solid #f7fafc;">المدفوع مقدماً</td>
                                    <td style="color: #047857; font-weight: 600; text-align: left; border-bottom: 1px solid #f7fafc;">${paidAmount.toLocaleString()} ج.م</td>
                                </tr>
                                <tr>
                                    <td style="color: #1a202c; font-weight: 800; font-size: 18px; padding-top: 25px;">المتبقي للتحصيل</td>
                                    <td style="color: #e53e3e; font-weight: 800; font-size: 18px; text-align: left; padding-top: 25px;">${remaining.toLocaleString()} ج.م</td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                    ${hasNotes ? `
                    <!-- Notes -->
                    <tr>
                        <td style="padding: 10px 40px 30px 40px;">
                            <div style="background-color: #f7fafc; border-left: 4px solid #cbd5e0; padding: 20px; border-radius: 4px;">
                                <h4 style="margin: 0 0 8px 0; color: #4a5568; font-size: 14px; text-transform: uppercase;">ملاحظات هامة</h4>
                                <p style="margin: 0; color: #1a202c; font-size: 15px; white-space: pre-line; line-height: 1.6;">${booking.notes}</p>
                            </div>
                        </td>
                    </tr>
                    ` : ''}

                    <!-- Action Button -->
                    <tr>
                        <td style="padding: 20px 40px 50px 40px; text-align: center;">
                            <a href="https://rentalmaneger.vercel.app/#/bookings" target="_blank" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-weight: 600; font-size: 15px; letter-spacing: 0.5px; transition: background-color 0.2s;">
                                فتح لوحة الإدارة
                            </a>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f7fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #edf2f7;">
                            <p style="color: #a0aec0; font-size: 12px; margin: 0; line-height: 1.5;">
                                تم إرسال هذا الإشعار تلقائياً عبر نظام Rental Manager.<br>
                                يرجى عدم الرد المباشر على هذه الرسالة.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const SMTP_USER = Deno.env.get('SMTP_USER') ?? "lastupdate0000@gmail.com";
        const SMTP_PASS = Deno.env.get('SMTP_PASS') ?? "hdgh mydi kiji uqsg";

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });

        // Adjust for Egypt timezone (UTC+3)
        const now = new Date();
        const egyptTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
        
        const tomorrow = new Date(egyptTime);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const { data: bookings, error: bookingErr } = await supabase
            .from('bookings')
            .select('*, units(name)')
            .eq('status', 'Confirmed')
            .or(`start_date.eq.${tomorrowStr},end_date.eq.${tomorrowStr}`);

        if (bookingErr) throw bookingErr;
        if (!bookings || bookings.length === 0) {
            return new Response(JSON.stringify({ msg: "No bookings for tomorrow" }), { headers: { "Content-Type": "application/json" } });
        }


        const userIds = [...new Set(bookings.map((b: any) => b.user_id))];
        const promises: Promise<any>[] = [];

        for (const userId of userIds) {
            if (!userId) continue;

            const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(userId);
            if (userErr || !userData?.user?.email) continue;

            const userEmail = userData.user.email;

            // Fetch partner_email from profile
            const { data: profile } = await supabase.from('profiles').select('partner_email').eq('id', userId).maybeSingle();
            const partnerEmail = profile?.partner_email;
            const userBookings = bookings.filter((b: any) => b.user_id === userId);

            for (const booking of userBookings) {
                const unitName = booking.units?.name || "الوحدة";
                const isCheckIn = booking.start_date === tomorrowStr;
                const isCheckOut = booking.end_date === tomorrowStr;

                let subject = "";
                let html = "";

                if (isCheckIn) {
                    subject = `تذكير بموعد دخول غداً: وحدة ${unitName} - Rental Manager`;
                    html = buildEmailTemplate("دخول عميل (Check-in)", "#2563eb", booking, unitName);
                }

                if (isCheckOut) {
                    subject = `تذكير بموعد مغادرة غداً: وحدة ${unitName} - Rental Manager`;
                    html = buildEmailTemplate("مغادرة عميل (Check-out)", "#d97706", booking, unitName);
                }

                if (subject && html) {
                    const mailOptions: any = {
                        from: `"Rental Manager" <${SMTP_USER}>`,
                        to: userEmail,
                        subject: subject,
                        html: html
                    };
                    
                    if (partnerEmail) {
                        mailOptions.cc = partnerEmail;
                    }

                    promises.push(transporter.sendMail(mailOptions));
                }
            }
        }

        const results = await Promise.all(promises);

        return new Response(JSON.stringify({ success: true, sent: promises.length }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err: any) {
        console.error("Function Error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});
