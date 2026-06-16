import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useI18n } from '../context/useAppExperience';

function normalizeOption(option) {
    if (typeof option === 'string' || typeof option === 'number') {
        return { value: String(option), label: String(option) };
    }

    return {
        value: String(option?.value ?? ''),
        label: String(option?.label ?? option?.value ?? ''),
        disabled: Boolean(option?.disabled),
    };
}

export default function SmartSelect({
    label,
    value,
    onChange,
    options = [],
    placeholder,
    icon: Icon,
    className = '',
    buttonClassName = '',
    menuClassName = '',
    disabled = false,
}) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const normalizedOptions = useMemo(() => options.map(normalizeOption), [options]);
    const selected = normalizedOptions.find((option) => String(option.value) === String(value));
    const displayLabel = selected?.label || placeholder || t('common.select');

    useEffect(() => {
        const closeOnOutsideClick = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener('pointerdown', closeOnOutsideClick);
        return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
    }, []);

    const chooseOption = (option) => {
        if (option.disabled) return;
        onChange?.(option.value);
        setOpen(false);
    };

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            {label && (
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/55">
                    {Icon && <Icon size={14} className="text-accent" />}
                    {label}
                </span>
            )}

            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((current) => !current)}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-borderGlass bg-obsidian/65 px-4 py-3 text-left text-sm font-semibold text-white shadow-[0_14px_40px_rgba(0,0,0,0.12)] outline-none transition-all hover:border-accent/45 focus:border-accent/60 focus:shadow-[0_0_0_4px_rgba(232,101,26,0.14)] disabled:cursor-not-allowed disabled:opacity-60 ${buttonClassName}`}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                {Icon && !label && <Icon size={15} className="shrink-0 text-accent" />}
                <span className={`min-w-0 truncate ${selected ? 'text-white' : 'text-white/42'}`}>
                    {displayLabel}
                </span>
                <ChevronDown
                    size={17}
                    className={`shrink-0 text-white/65 transition-transform ${open ? 'rotate-180 text-accent' : ''}`}
                />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.16 }}
                        className={`absolute left-0 right-0 top-[calc(100%+8px)] z-[85] max-h-72 overflow-hidden rounded-2xl border border-accent/25 bg-deepNavy/98 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl ${menuClassName}`}
                        role="listbox"
                    >
                        <div className="max-h-72 overflow-y-auto p-1.5">
                            {normalizedOptions.map((option) => {
                                const active = String(option.value) === String(value);

                                return (
                                    <button
                                        key={`${option.value}-${option.label}`}
                                        type="button"
                                        disabled={option.disabled}
                                        onClick={() => chooseOption(option)}
                                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                                            active
                                                ? 'bg-accent/15 text-white'
                                                : 'text-white/75 hover:bg-white/10 hover:text-white'
                                        } disabled:cursor-not-allowed disabled:opacity-45`}
                                        role="option"
                                        aria-selected={active}
                                    >
                                        <span className="min-w-0 truncate">{option.label}</span>
                                        {active && <Check size={15} className="shrink-0 text-accent" />}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
