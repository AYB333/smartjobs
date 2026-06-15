import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Briefcase, Home, LayoutDashboard, Plus, Search, Shield, UserRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../context/useAppExperience';

function parseStoredUser() {
    try {
        const rawUser = localStorage.getItem('user');
        return rawUser ? JSON.parse(rawUser) : null;
    } catch {
        return null;
    }
}

function buildActions(role, t) {
    const publicActions = [
        { label: t('command.home'), path: '/', icon: Home },
        { label: t('command.jobs'), path: '/jobs', icon: Briefcase },
    ];

    if (role === 'candidat') {
        return [
            ...publicActions,
            { label: t('command.candidatDashboard'), path: '/candidat/dashboard', icon: LayoutDashboard },
            { label: t('command.profile'), path: '/candidat/profile', icon: UserRound },
        ];
    }

    if (role === 'recruteur') {
        return [
            ...publicActions,
            { label: t('command.recruteurDashboard'), path: '/recruteur/dashboard', icon: LayoutDashboard },
            { label: 'Profil recruteur', path: '/recruteur/profile', icon: UserRound },
            { label: t('command.createOffer'), path: '/recruteur/offer/create', icon: Plus },
            { label: t('command.recruteurApplications'), path: '/recruteur/candidatures', icon: UserRound },
        ];
    }

    if (role === 'admin') {
        return [
            ...publicActions,
            { label: t('command.admin'), path: '/admin/dashboard', icon: Shield },
        ];
    }

    return publicActions;
}

export default function CommandPalette({ open, onClose }) {
    const [query, setQuery] = useState('');
    const panelRef = useRef(null);
    const navigate = useNavigate();
    const { t } = useI18n();
    const currentUser = parseStoredUser();

    const closePalette = useCallback(() => {
        setQuery('');
        onClose();
    }, [onClose]);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                closePalette();
            }
        };

        if (open) {
            window.addEventListener('keydown', onKeyDown);
        }

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [closePalette, open]);

    useEffect(() => {
        const onPointerDown = (event) => {
            if (!panelRef.current?.contains(event.target)) {
                closePalette();
            }
        };

        if (open) {
            window.addEventListener('pointerdown', onPointerDown, true);
        }

        return () => window.removeEventListener('pointerdown', onPointerDown, true);
    }, [closePalette, open]);

    const actions = useMemo(() => buildActions(currentUser?.role, t), [currentUser?.role, t]);
    const filteredActions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) {
            return actions;
        }

        return actions.filter((action) => action.label.toLowerCase().includes(normalizedQuery));
    }, [actions, query]);

    const runAction = (path) => {
        navigate(path);
        closePalette();
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none fixed inset-0 z-[80] flex items-start justify-center bg-black/60 px-4 pt-28 backdrop-blur-sm"
                >
                    <motion.div
                        ref={panelRef}
                        initial={{ opacity: 0, y: -16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.98 }}
                        className="pointer-events-auto w-full max-w-xl overflow-hidden rounded-3xl border border-borderGlass bg-deepNavy/95 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="border-b border-borderGlass p-5">
                            <div className="mb-4 flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-bold text-white">{t('command.title')}</h2>
                                    <p className="mt-1 text-sm text-white/55">{t('command.subtitle')}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closePalette}
                                    className="rounded-full border border-borderGlass bg-white/5 p-2 text-white/70 transition-colors hover:border-accent/50 hover:text-white"
                                    aria-label="Fermer"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="flex items-center gap-3 rounded-2xl border border-borderGlass bg-obsidian/60 px-4 py-3">
                                <Search size={17} className="text-accent" />
                                <input
                                    autoFocus
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder={t('command.search')}
                                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                                />
                            </div>
                        </div>

                        <div className="max-h-[380px] overflow-y-auto p-2">
                            {filteredActions.length === 0 && (
                                <div className="px-4 py-10 text-center text-sm text-white/45">
                                    {t('command.empty')}
                                </div>
                            )}

                            {filteredActions.map((action) => {
                                const Icon = action.icon;
                                return (
                                    <button
                                        key={action.path}
                                        type="button"
                                        onClick={() => runAction(action.path)}
                                        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                                    >
                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-accent">
                                            <Icon size={17} />
                                        </span>
                                        <span className="font-medium">{action.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
