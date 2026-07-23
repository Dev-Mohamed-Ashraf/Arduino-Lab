/**
 * Arabic RTL email templates.
 *
 * Styles are inlined and the layout is table-free-but-simple: mail clients strip
 * <style> blocks and external CSS, so anything not inline will not survive.
 */

interface Layout {
  title: string;
  greeting: string;
  body: string[];
  action?: { label: string; url: string };
  footnote?: string;
}

const BRAND = '#00979d';
const TEXT = '#1a2027';
const MUTED = '#5b6670';
const BORDER = '#e4e8eb';

function renderLayout({ title, greeting, body, action, footnote }: Layout): string {
  const paragraphs = body
    .map((line) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.9;color:${TEXT}">${line}</p>`)
    .join('');

  const button = action
    ? `<p style="margin:26px 0">
         <a href="${action.url}"
            style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;
                   padding:13px 30px;border-radius:8px;font-size:15px;font-weight:600">${action.label}</a>
       </p>
       <p style="margin:0 0 14px;font-size:13px;line-height:1.8;color:${MUTED}">
         إذا لم يعمل الزر، انسخ الرابط التالي والصقه في المتصفح:<br />
         <span style="direction:ltr;display:inline-block;word-break:break-all;color:${BRAND}">${action.url}</span>
       </p>`
    : '';

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${title}</title></head>
<body style="margin:0;padding:24px 12px;background:#f4f6f8;
             font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;text-align:right">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid ${BORDER};border-radius:14px;overflow:hidden">
    <div style="background:${BRAND};padding:20px 28px">
      <span style="color:#ffffff;font-size:17px;font-weight:700">معمل الأردوينو</span>
    </div>
    <div style="padding:28px">
      <h1 style="margin:0 0 18px;font-size:19px;color:${TEXT}">${title}</h1>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.9;color:${TEXT}">${greeting}</p>
      ${paragraphs}
      ${button}
      ${footnote ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.8;color:${MUTED}">${footnote}</p>` : ''}
    </div>
    <div style="border-top:1px solid ${BORDER};padding:16px 28px;background:#fafbfc">
      <p style="margin:0;font-size:12px;color:${MUTED}">
        هذه رسالة آلية من نظام حجز معمل الأردوينو — برجاء عدم الرد عليها.
      </p>
    </div>
  </div>
</body>
</html>`;
}


export function resetPasswordTemplate(fullName: string, url: string) {
  return {
    subject: 'إعادة تعيين كلمة المرور — معمل الأردوينو',
    html: renderLayout({
      title: 'إعادة تعيين كلمة المرور',
      greeting: `مرحبًا ${fullName}،`,
      body: ['وصلنا طلب لإعادة تعيين كلمة مرور حسابك. اضغط على الزر التالي لتعيين كلمة مرور جديدة.'],
      action: { label: 'تعيين كلمة مرور جديدة', url },
      footnote: 'صلاحية الرابط ساعة واحدة. إذا لم تطلب ذلك، تجاهل الرسالة وكلمة مرورك لن تتغير.',
    }),
  };
}

export interface BookingMailData {
  fullName: string;
  bookingNumber: string;
  bookingDate: string;
  slotLabel: string;
  groupNumber: number;
  projectTitle: string;
  componentLines: string[];
  receiptUrl: string;
}

export function bookingConfirmedTemplate(data: BookingMailData) {
  return {
    subject: `تأكيد الحجز ${data.bookingNumber} — معمل الأردوينو`,
    html: renderLayout({
      title: 'تم تأكيد حجزك',
      greeting: `مرحبًا ${data.fullName}،`,
      body: [
        'تم تسجيل حجز مجموعتك بنجاح. هذه بيانات الحجز:',
        renderBookingFacts(data),
        `<strong>المكوّنات المطلوبة:</strong><br />${data.componentLines.join('<br />')}`,
      ],
      action: { label: 'عرض وطباعة إيصال الحجز', url: data.receiptUrl },
      footnote:
        'الحجز مؤكد ومقفول للتعديل. لأي تغيير تواصل مع إدارة المعمل. أحضر الإيصال مطبوعًا عند الحضور.',
    }),
  };
}

export function bookingCancelledTemplate(data: Omit<BookingMailData, 'componentLines' | 'receiptUrl'>) {
  return {
    subject: `إلغاء الحجز ${data.bookingNumber} — معمل الأردوينو`,
    html: renderLayout({
      title: 'تم إلغاء حجزك',
      greeting: `مرحبًا ${data.fullName}،`,
      body: [
        'تم إلغاء الحجز التالي من قِبَل إدارة المعمل، وأُعيدت المكوّنات المحجوزة إلى المخزون:',
        renderBookingFacts(data),
      ],
      footnote: 'إذا كان هناك استفسار بخصوص الإلغاء، تواصل مع إدارة المعمل.',
    }),
  };
}

function renderBookingFacts(data: Omit<BookingMailData, 'componentLines' | 'receiptUrl'>): string {
  return [
    `<strong>رقم الحجز:</strong> ${data.bookingNumber}`,
    `<strong>التاريخ:</strong> ${data.bookingDate}`,
    `<strong>الفترة:</strong> ${data.slotLabel}`,
    `<strong>رقم المجموعة:</strong> ${data.groupNumber}`,
    `<strong>المشروع:</strong> ${data.projectTitle}`,
  ].join('<br />');
}
