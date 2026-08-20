import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Unit } from '../types';
import { Check, ChevronDown } from 'lucide-react';

interface MultiSelectUnitsProps {
    units: Unit[];
    selectedUnitIds: string[];
    onChange: (selectedIds: string[]) => void;
}

export const MultiSelectUnits: React.FC<MultiSelectUnitsProps> = ({
    units,
    selectedUnitIds,
    onChange
}) => {
    const { language, isRTL } = useApp();
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

    const toggleUnit = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedUnitIds.includes(id)) {
            onChange(selectedUnitIds.filter(uId => uId !== id));
        } else {
            onChange([...selectedUnitIds, id]);
        }
    };

    const selectAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]); // Empty array means 'all'
    };

    const isAllSelected = selectedUnitIds.length === 0;

    let displayText = language === 'ar' ? 'كل الوحدات (All Units)' : 'All Units';
    if (!isAllSelected) {
        if (selectedUnitIds.length === 1) {
            const u = units.find(u => u.id === selectedUnitIds[0]);
            displayText = u ? u.name : '1 Selected';
        } else {
            displayText = `${selectedUnitIds.length} ${language === 'ar' ? 'محددة' : 'Selected'}`;
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
                        {language === 'ar' ? 'كل الوحدات (All Units)' : 'All Units'}
                    </button>

                    {units.length === 0 && (
                        <div className="text-center text-gray-400 text-xs py-3 italic font-bold">
                            {language === 'ar' ? 'لا توجد وحدات' : 'No units found'}
                        </div>
                    )}

                    {units.map(u => {
                        const isSelected = selectedUnitIds.includes(u.id);

                        return (
                            <button
                                key={u.id}
                                type="button"
                                onClick={(e) => {
                                    if (isAllSelected) {
                                        e.stopPropagation();
                                        onChange([u.id]);
                                    } else {
                                        toggleUnit(u.id, e);
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
                                    <span className="font-bold truncate w-full">{u.name}</span>
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    );
};
