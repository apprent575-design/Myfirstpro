
import React from 'react';
import { useApp } from '../context/AppContext';
import {
    Home,
    Calendar,
    DollarSign,
    FileText,
    Shield,
    CheckCircle,
    TrendingUp,
    Users,
    MessageCircle,
    MousePointer,
    Filter,
    Calculator,
    PieChart,
    List,
    Receipt,
    Phone,
    ThumbsUp,
    Search,
    Printer
} from 'lucide-react';

export const FeaturesGuide = () => {
    const { language, isRTL } = useApp();

    const newFeatures = [
        {
            icon: MessageCircle,
            title: language === 'ar' ? 'التواصل المباشر (واتساب & هاتف)' : 'Direct Communication (WhatsApp & Call)',
            desc: language === 'ar'
                ? 'تم إضافة أزرار جديدة في بطاقة الحجز وتفاصيل التقويم. اضغط على زر "واتساب" لفتح المحادثة فوراً دون حفظ الرقم، أو زر "الهاتف" للاتصال المباشر بالمستأجر.'
                : 'New buttons added to booking cards and calendar details. Click "WhatsApp" to chat immediately without saving the number, or "Call" to dial the tenant directly.',
            color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
        },
        {
            icon: Filter,
            title: language === 'ar' ? 'نظام الفلترة الشامل' : 'Comprehensive Filtering System',
            desc: language === 'ar'
                ? 'تحكم كامل في البيانات المعروضة. يمكنك الآن تصفية الحجوزات والتقارير حسب "الوحدة" المحددة أو "الفترة الزمنية". استخدم زر "كل المدة" لعرض التاريخ بالكامل.'
                : 'Full control over data. You can now filter bookings and reports by specific "Unit" or "Date Range". Use the "All Time" button to view the entire history.',
            color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
        },
        {
            icon: ThumbsUp,
            title: language === 'ar' ? 'تقييم النزلاء (القائمة السوداء)' : 'Guest Rating (Blacklist)',
            desc: language === 'ar'
                ? 'ميزة تقييم المستأجر: "مرحب به" أو "غير مرحب به". تظهر علامة واضحة في بطاقة الحجز لتنبيهك عند التعامل مع مستأجر سابق سيء السمعة.'
                : 'Tenant rating feature: "Welcome Again" or "Not Welcome". A clear badge appears on the booking card to alert you when dealing with a previously flagged tenant.',
            color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
        }
    ];

    const coreFeatures = [
        {
            icon: Calculator,
            title: language === 'ar' ? 'محرك مالي ذكي' : 'Smart Financial Engine',
            desc: language === 'ar'
                ? 'حساب تلقائي للإجماليات. النظام يفصل "الإيجار الأساسي" عن "رسوم القرية" و"الهاوس كيبنج"، ويقوم بخصم المصروفات تلقائياً لعرض صافي الربح الحقيقي.'
                : 'Automated totals calculation. The system separates "Base Rent" from "Village Fees" and "Housekeeping", automatically deducting expenses to show true Net Profit.',
            color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
        },
        {
            icon: Calendar,
            title: language === 'ar' ? 'التقويم التفاعلي الملون' : 'Interactive Color Calendar',
            desc: language === 'ar'
                ? 'عرض بصري للحجوزات. اللون الأخضر للمؤكد، الأصفر للانتظار، والأحمر للملغي. اضغط على أي حجز في التقويم لفتح نافذة التفاصيل السريعة مع أزرار الاتصال.'
                : 'Visual booking display. Green for Confirmed, Yellow for Pending, Red for Cancelled. Click any booking on the calendar to open quick details with contact buttons.',
            color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
        },
        {
            icon: DollarSign,
            title: language === 'ar' ? 'إدارة المصروفات' : 'Expense Management',
            desc: language === 'ar'
                ? 'سجل كل مصروف (كهرباء، مياه، صيانة) واربطه بالوحدة. يساعدك هذا في معرفة تكلفة تشغيل كل وحدة بدقة واستخراج تقارير الأرباح والخسائر.'
                : 'Log every expense (Electricity, Water, Maintenance) and link it to a unit. This helps you track operational costs per unit and generate P&L reports.',
            color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
        }
    ];

    const reportTypes = language === 'ar' ? [
        {
            title: 'إيصال استلام نقدية (للنزلاء)',
            icon: Receipt,
            details: [
                'زر مباشر "إصدار فاتورة" في بطاقة الحجز',
                'تصميم احترافي جاهز للطباعة أو الإرسال',
                'يفصل التأمين عن الإجمالي (للتوضيح أنه مسترد)',
                'يحتوي على تفاصيل الوحدة، الليالي، والمبالغ المدفوعة والمتبقية'
            ]
        },
        {
            title: 'تقرير رسوم القرية (جديد)',
            icon: TicketCheck,
            details: [
                'مخصص لحسابات البوابات ورسوم الدخول',
                'يحسب: عدد الليالي × رسم القرية اليومي',
                'يعرض إجمالي المبلغ المستحق للقرية عن كل وحدة',
                'ضروري لتسوية الحسابات مع إدارة القرية أو الملاك'
            ]
        },
        {
            title: 'تقرير الإشغال والمالية',
            icon: PieChart,
            details: [
                'تحليل شامل للإيرادات مقابل المصروفات',
                'صافي الربح لكل وحدة على حدة',
                'سجل تاريخي للمستأجرين في كل وحدة',
                'تصدير PDF بضغطة زر للمشاركة مع الملاك'
            ]
        }
    ] : [
        {
            title: 'Guest Receipt / Invoice',
            icon: Receipt,
            details: [
                'Direct "Receipt" button on booking card',
                'Professional design ready for print or sharing',
                'Separates Security Deposit (refund clarity)',
                'Includes Unit details, Nights, Paid/Unpaid amounts'
            ]
        },
        {
            title: 'Village Fees Report (New)',
            icon: TicketCheck,
            details: [
                'Dedicated for Gate/Village entrance fees',
                'Calculates: Nights × Daily Fee',
                'Shows total due amount to the Village per unit',
                'Essential for settling accounts with Village Admin/Owners'
            ]
        },
        {
            title: 'Occupancy & Financial Report',
            icon: PieChart,
            details: [
                'Comprehensive Revenue vs. Expense analysis',
                'Net Profit per Unit breakdown',
                'Historical log of tenants per unit',
                'One-click PDF export for owners'
            ]
        }
    ];

    return (
        <div className="space-y-12 pb-16">

            {/* Hero Section */}
            <div className="text-center max-w-4xl mx-auto space-y-6 pt-8">
                <div className="inline-block p-3 rounded-2xl bg-gradient-to-br from-primary-500 to-blue-600 text-white shadow-xl mb-4">
                    <Shield size={48} />
                </div>
                <h2 className="text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                    {language === 'ar' ? 'نظام إدارة الممتلكات العقارية' : 'Property Management System'}
                </h2>
                <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                    {language === 'ar'
                        ? 'دليلك المتكامل لاستخدام النظام. اكتشف الأدوات الجديدة للتواصل، الفلترة المتقدمة، والتقارير المالية الدقيقة.'
                        : 'Your complete guide. Discover new communication tools, advanced filtering, and precise financial reporting.'}
                </p>
            </div>

            {/* NEW FEATURES SPOTLIGHT */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-1 bg-green-500 rounded-full"></div>
                    <h3 className="text-2xl font-black text-gray-800 dark:text-white">
                        {language === 'ar' ? 'أحدث الإضافات والتحسينات' : 'Newest Features & Updates'}
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {newFeatures.map((f, i) => (
                        <div key={i} className="glass p-8 rounded-3xl border border-green-100/50 dark:border-green-900/20 hover:shadow-xl transition-all duration-300 group">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${f.color} shadow-sm group-hover:scale-110 transition-transform`}>
                                <f.icon size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{f.title}</h3>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm font-medium">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* CORE FEATURES */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-1 bg-indigo-500 rounded-full"></div>
                    <h3 className="text-2xl font-black text-gray-800 dark:text-white">
                        {language === 'ar' ? 'أساسيات النظام' : 'Core System Features'}
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {coreFeatures.map((f, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-gray-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${f.color} shadow-sm`}>
                                <f.icon size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{f.title}</h3>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* REPORTING ECOSYSTEM */}
            <div className="glass rounded-[40px] p-8 md:p-12 border border-gray-200 dark:border-slate-700 bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800">
                <div className="text-center mb-12">
                    <h3 className="text-3xl font-black text-gray-800 dark:text-white mb-4">
                        {language === 'ar' ? 'منظومة التقارير المتكاملة' : 'Integrated Reporting Ecosystem'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                        {language === 'ar'
                            ? 'ثلاثة أنواع من التقارير تغطي كافة احتياجاتك: للنزيل، للإدارة، وللملاك. جميعها قابلة للتصدير بصيغة PDF.'
                            : 'Three report types covering all needs: For Guests, Management, and Owners. All exportable to PDF.'}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {reportTypes.map((report, idx) => (
                        <div key={idx} className="relative bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 dark:bg-slate-800 rounded-bl-[100px] -mr-1 -mt-1 z-0"></div>
                            <div className="relative z-10">
                                <div className="h-16 w-16 bg-blue-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                                    <report.icon size={32} />
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-6 h-12 flex items-center">{report.title}</h4>
                                <ul className="space-y-4">
                                    {report.details.map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                                            <CheckCircle size={18} className="text-green-500 mt-0.5 shrink-0" />
                                            <span className="leading-snug">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Workflow Steps */}
            <div className="flex flex-col md:flex-row gap-8 items-center bg-blue-600 rounded-[32px] p-8 md:p-12 text-white shadow-xl shadow-blue-900/20">
                <div className="flex-1 space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-sm font-bold border border-white/10">
                        <MousePointer size={16} />
                        {language === 'ar' ? 'خطوات العمل' : 'Workflow'}
                    </div>
                    <h3 className="text-3xl font-black leading-tight">
                        {language === 'ar' ? 'كيف تبدأ العمل على النظام؟' : 'How to get started?'}
                    </h3>
                    <p className="text-blue-100 text-lg leading-relaxed">
                        {language === 'ar'
                            ? 'خطوات بسيطة تضمن لك إدارة خالية من الأخطاء المالية والإدارية.'
                            : 'Simple steps to ensure error-free financial and administrative management.'}
                    </p>
                </div>

                <div className="flex-1 grid gap-4 w-full">
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">1</div>
                        <div>
                            <h4 className="font-bold text-lg">{language === 'ar' ? 'إضافة الوحدات' : 'Add Units'}</h4>
                            <p className="text-sm text-blue-100">{language === 'ar' ? 'عرف الفلل والشاليهات الخاصة بك.' : 'Define your Villas and Chalets.'}</p>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">2</div>
                        <div>
                            <h4 className="font-bold text-lg">{language === 'ar' ? 'تسجيل الحجز' : 'Create Booking'}</h4>
                            <p className="text-sm text-blue-100">{language === 'ar' ? 'أدخل البيانات، حدد السعر، واحفظ رقم العميل.' : 'Enter details, set price, save client number.'}</p>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">3</div>
                        <div>
                            <h4 className="font-bold text-lg">{language === 'ar' ? 'التواصل والتحصيل' : 'Connect & Collect'}</h4>
                            <p className="text-sm text-blue-100">{language === 'ar' ? 'استخدم زر واتساب لإرسال الإيصال وتأكيد الدفع.' : 'Use WhatsApp button to send receipt & confirm pay.'}</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

// Helper Icon for new Village Fees Report
const TicketCheck = ({ size, className }: any) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <path d="M13 5v2" />
        <path d="M13 17v2" />
        <path d="M13 11v2" />
    </svg>
);
