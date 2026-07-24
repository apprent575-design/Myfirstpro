import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { Filter, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface FilterPopoverProps {
    children: ReactNode;
}

export const FilterPopover = ({ children }: FilterPopoverProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const { language, isRTL } = useApp();

    return (
        <div className="h-full">
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 md:py-3 text-sm font-bold text-gray-700 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all h-full"
            >
                <Filter size={18} className="text-primary-500" />
                {language === 'ar' ? 'فلاتر' : 'Filters'}
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" dir={isRTL ? 'rtl' : 'ltr'}>
                    <div className="bg-white dark:bg-slate-800 shadow-2xl rounded-[24px] w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                                <Filter size={20} className="text-primary-500" />
                                {language === 'ar' ? 'خيارات الفلترة' : 'Filter Options'}
                            </h3>
                            <button type="button" onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
                            {children}
                        </div>

                        <div className="p-5 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-primary-600/30 transition-all flex justify-center items-center"
                            >
                                {language === 'ar' ? 'تطبيق وإغلاق' : 'Apply & Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
