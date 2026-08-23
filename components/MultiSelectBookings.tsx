import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Booking } from '../types';
import { Check, ChevronDown } from 'lucide-react';

interface MultiSelectBookingsProps {
    bookings: Booking[];
    selectedBookingIds: string[];
    onChange: (selectedIds: string[]) => void;
}

export const MultiSelectBookings: React.FC<MultiSelectBookingsProps> = ({
    bookings,
    selectedBookingIds,
    onChange
}) => {
    const { language, isRTL, formatDate } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle clicking outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const toggleBooking = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedBookingIds.includes(id)) {
            onChange(selectedBookingIds.filter(bId => bId !== id));
        } else {
            onChange([...selectedBookingIds, id]);
        }
    };

    const selectAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]); // Empty array means 'all'
    };

    const isAllSelected = selectedBookingIds.length === 0;

    let displayText = language === 'ar' ? 'كل الحجوزات' : 'All Bookings';
    if (!isAllSelected) {
        if (selectedBookingIds.length === 1) {
            if (selectedBookingIds[0] === 'none') {
                displayText = language === 'ar' ? 'بدون حجوزات' : 'Without Bookings';
            } else {
                const b = bookings.find(b => b.id === selectedBookingIds[0]);
                displayText = b ? b.tenant_name : '1 Selected';
            }
        } else {
            displayText = `${selectedBookingIds.length} ${language === 'ar' ? 'محددة' : 'Selected'}`;
        }
    }

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between bg-gray-50 dark:bg-slate-700 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 w-full hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                <span className="truncate">{displayText}</span>
                <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl z-[60] max-h-56 overflow-y-auto p-1.5 flex flex-col gap-1 text-sm">
                    <button
                        type="button"
                        onClick={selectAll}
                        className={`flex items-center gap-2 p-2 rounded-md transition-colors text-left font-bold ${isAllSelected ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200'
                            }`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                    >
                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${isAllSelected ? 'bg-primary-500 border-primary-500 text-white' : 'border-gray-300 dark:border-gray-500'
                            }`}>
                            {isAllSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                        {language === 'ar' ? 'كل الحجوزات' : 'All Bookings'}
                    </button>

                    <button
                        type="button"
                        onClick={(e) => {
                            if (isAllSelected) {
                                e.stopPropagation();
                                onChange(['none']);
                            } else {
                                toggleBooking('none', e);
                            }
                        }}
                        className={`flex items-center gap-2 p-2 rounded-md transition-colors text-left font-bold ${selectedBookingIds.includes('none') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200'
                            }`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                    >
                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${selectedBookingIds.includes('none') ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 dark:border-gray-500'
                            }`}>
                            {selectedBookingIds.includes('none') && <Check size={12} strokeWidth={3} />}
                        </div>
                        {language === 'ar' ? 'بدون حجوزات' : 'Without Bookings'}
                    </button>

                    {bookings.length === 0 && (
                        <div className="text-center text-gray-400 text-xs py-3 italic font-bold">
                            {language === 'ar' ? 'لا توجد حجوزات تتطابق مع بحثك' : 'No bookings map to your search'}
                        </div>
                    )}

                    {bookings.map(b => {
                        const isSelected = selectedBookingIds.includes(b.id);
                        const start = new Date(b.start_date);

                        return (
                            <button
                                key={b.id}
                                type="button"
                                onClick={(e) => {
                                    if (isAllSelected) {
                                        e.stopPropagation();
                                        onChange([b.id]);
                                    } else {
                                        toggleBooking(b.id, e);
                                    }
                                }}
                                className={`flex items-center gap-2 p-2 rounded-md transition-colors text-left ${isSelected ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200'
                                    }`}
                                dir={isRTL ? 'rtl' : 'ltr'}
                            >
                                <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 dark:border-gray-500'
                                    }`}>
                                    {isSelected && <Check size={12} strokeWidth={3} />}
                                </div>
                                <div className="flex flex-col items-start w-full overflow-hidden">
                                    <span className="font-bold truncate w-full">{b.tenant_name}</span>
                                    <span className="text-[10px] text-gray-500 opacity-80">{formatDate(start)}</span>
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    );
};
