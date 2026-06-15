import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Languages, Menu, Moon, Search, Sun, X } from 'lucide-react';
import { useAppExperience } from '../context/useAppExperience';
import api from '../api/axios';

function parseStoredUser() {
    try {
        const rawUser = localStorage.getItem('user');
        return rawUser ? JSON.parse(rawUser) : null;
    } catch {
        return null;
    }
}

function getBackendBaseUrl() {
    const base = api?.defaults?.baseURL || '';
    return base.replace(/\/api\/?$/, '');
}

function buildStorageUrl(baseUrl, path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const cleanPath = String(path).replace(/^\/+/, '');
    if (cleanPath.startsWith('storage/')) {
        return `${baseUrl}/${cleanPath}`;
    }
    return `${baseUrl}/storage/${cleanPath}`;
}

function getUserProfile(user) {
    return user?.candidatProfile
        ?? user?.candidat_profile
        ?? user?.recruteurProfile
        ?? user?.recruteur_profile
        ?? user?.profile
        ?? {};
}

function getProfilePhotoUrl(user) {
    const profile = getUserProfile(user);
    return buildStorageUrl(getBackendBaseUrl(), profile?.photo_url || profile?.photo_path);
}

function extractList(payload) {
    const source = payload?.data;
    if (Array.isArray(source?.data)) return source.data;
    if (Array.isArray(source)) return source;
    return [];
}

function getOfferFromApplication(application) {
    return application?.jobOffer ?? application?.job_offer ?? {};
}

function hasOfferQuiz(offer) {
    return Boolean(offer?.quiz || offer?.quiz_exists);
}

function getApplicationsCount(offer) {
    if (typeof offer?.applications_count === 'number') {
        return offer.applications_count;
    }

    if (Array.isArray(offer?.applications)) {
        return offer.applications.length;
    }

    return 0;
}

function getInitials(name) {
    const initials = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    return initials || 'U';
}

function AvatarMark({ imageUrl, alt, letter }) {
    return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-bold text-white">
            {imageUrl ? (
                <img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
            ) : (
                letter
            )}
        </span>
    );
}

function getCenterLinks(role, isAuthenticated, t) {
    const unique = (items) => {
        const seen = new Set();
        return items.filter((item) => {
            const key = `${item.label}:${item.to}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    if (!isAuthenticated) {
        return unique([
            { label: t('nav.jobs'), to: '/jobs' },
        ]);
    }

    if (role === 'recruteur') {
        return unique([
            { label: 'Principale', to: '/recruteur/dashboard' },
            { label: t('nav.myOffers'), to: '/recruteur/dashboard#mes-offres' },
            { label: 'Candidatures', to: '/recruteur/candidatures' },
        ]);
    }

    if (role === 'candidat') {
        return unique([
            { label: 'Principale', to: '/candidat/dashboard' },
            { label: t('nav.jobs'), to: '/jobs' },
        ]);
    }

    return unique([
        { label: t('nav.jobs'), to: '/jobs' },
    ]);
}

function getRoleCta(role, isAuthenticated, t) {
    if (!isAuthenticated) {
        return { label: t('nav.login'), to: '/auth', accent: false };
    }

    if (role === 'recruteur') {
        return { label: t('nav.createOffer'), to: '/recruteur/offer/create', accent: true };
    }

    if (role === 'candidat') {
        return { label: t('nav.applications'), to: '/candidat/dashboard', accent: true };
    }

    return { label: t('nav.admin'), to: '/admin/dashboard', accent: true };
}

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(() => parseStoredUser());
    const [notificationCount, setNotificationCount] = useState(0);
    const { language, languages, setLanguage, t, theme, toggleTheme } = useAppExperience();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setCurrentUser(parseStoredUser());
            setMenuOpen(false);
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [location.pathname]);

    useEffect(() => {
        const syncAuthState = () => setCurrentUser(parseStoredUser());
        window.addEventListener('storage', syncAuthState);
        return () => window.removeEventListener('storage', syncAuthState);
    }, []);

    useEffect(() => {
        if (!currentUser) {
            const timeoutId = window.setTimeout(() => {
                setNotificationCount(0);
            }, 0);

            return () => window.clearTimeout(timeoutId);
        }

        const timeoutId = window.setTimeout(async () => {
            try {
                if (currentUser.role === 'candidat') {
                    const response = await api.get('/mes-postulations', { params: { limit: 100 } });
                    const applications = extractList(response?.data);
                    const count = applications.filter((application) => {
                        const offer = getOfferFromApplication(application);
                        return (application.quiz_score === null && hasOfferQuiz(offer))
                            || application.status === 'acceptee'
                            || application.status === 'refusee';
                    }).length;
                    setNotificationCount(count);
                    return;
                }

                if (currentUser.role === 'recruteur') {
                    const response = await api.get('/mes-offres');
                    const offers = extractList(response?.data);
                    setNotificationCount(offers.reduce((total, offer) => total + getApplicationsCount(offer), 0));
                    return;
                }

                if (currentUser.role === 'admin') {
                    const response = await api.get('/admin/stats');
                    setNotificationCount(Number(response?.data?.data?.total_offres_all ?? 0));
                }
            } catch {
                setNotificationCount(0);
            }
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [currentUser]);

    const isAuthenticated = Boolean(currentUser);
    const role = currentUser?.role || '';
    const displayName = currentUser?.name || 'Utilisateur';
    const avatarLetter = getInitials(displayName);
    const avatarPhotoUrl = getProfilePhotoUrl(currentUser);
    const centerLinks = useMemo(() => getCenterLinks(role, isAuthenticated, t), [role, isAuthenticated, t]);
    const roleCta = useMemo(() => getRoleCta(role, isAuthenticated, t), [role, isAuthenticated, t]);
    const ThemeIcon = theme === 'dark' ? Sun : Moon;
    const profilePath = role === 'candidat'
        ? '/candidat/profile'
        : role === 'recruteur'
            ? '/recruteur/profile'
            : null;
    const notificationPath = role === 'candidat'
        ? '/candidat/dashboard'
        : role === 'recruteur'
            ? '/recruteur/candidatures'
            : '/admin/dashboard';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setCurrentUser(null);
        setMenuOpen(false);
        navigate('/auth', { replace: true });
    };

    const openCommandPalette = () => {
        window.dispatchEvent(new Event('smartjobs:open-command'));
    };

    const navLinkClass = 'text-sm font-medium tracking-[0.02em] text-white/70 hover:text-white transition-colors relative group whitespace-nowrap';
    const navUnderlineClass = 'absolute -bottom-1 left-0 w-0 h-[2px] bg-accent transition-all duration-300 ease-out group-hover:w-full';
    const utilityButtonClass = 'hidden lg:inline-flex h-10 w-10 items-center justify-center rounded-full border border-borderGlass bg-surface text-white/80 transition-all duration-300 hover:border-accent/50 hover:text-white';

    return (
        <motion.nav
            className="fixed top-0 w-full z-50 bg-obsidian/80 backdrop-blur-md border-b border-white/5 py-4 transition-all duration-500"
        >
            <div className="container mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 lg:gap-5">
                    <div className="flex min-w-0 items-center gap-3">
                        <Link to="/" className="text-2xl font-black tracking-tight flex items-center gap-1 group">
                            SmartJobs
                            <span className="w-2 h-2 rounded-full bg-accent group-hover:scale-150 transition-transform duration-300"></span>
                        </Link>
                    </div>

                    <div className="hidden min-w-0 items-center justify-center gap-4 xl:flex xl:gap-8">
                        {centerLinks.map((item) => (
                            <Link key={item.label} to={item.to} className={navLinkClass}>
                                {item.label}
                                <span className={navUnderlineClass}></span>
                            </Link>
                        ))}
                    </div>

                    <div className="flex min-w-0 items-center justify-end gap-2 md:gap-3">
                        <button
                            type="button"
                            onClick={openCommandPalette}
                            className={utilityButtonClass}
                            aria-label={t('toolbar.command')}
                            title={`${t('toolbar.command')} (${t('command.hint')})`}
                        >
                            <Search size={17} />
                        </button>

                        <button
                            type="button"
                            onClick={toggleTheme}
                            className={utilityButtonClass}
                            aria-label={theme === 'dark' ? t('toolbar.theme.light') : t('toolbar.theme.dark')}
                            title={theme === 'dark' ? t('toolbar.theme.light') : t('toolbar.theme.dark')}
                        >
                            <ThemeIcon size={17} />
                        </button>

                        <div className="hidden lg:flex h-10 items-center gap-2 rounded-full border border-borderGlass bg-surface px-3 text-white/80">
                            <Languages size={16} className="text-accent" />
                            <select
                                value={language}
                                onChange={(event) => setLanguage(event.target.value)}
                                className="bg-transparent text-sm font-semibold text-white outline-none"
                                aria-label={t('toolbar.language')}
                            >
                                {Object.values(languages).map((item) => (
                                    <option key={item.code} value={item.code} className="bg-deepNavy text-white">
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {isAuthenticated && (
                            <Link
                                to={notificationPath}
                                className={utilityButtonClass}
                                aria-label="Notifications"
                                title={`${notificationCount} notification${notificationCount > 1 ? 's' : ''}`}
                            >
                                <span className="relative inline-flex">
                                    <Bell size={17} />
                                    {notificationCount > 0 && (
                                        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                                            {notificationCount > 9 ? '9+' : notificationCount}
                                        </span>
                                    )}
                                </span>
                            </Link>
                        )}

                        {isAuthenticated && (
                            <>
                                {profilePath ? (
                                    <Link
                                        to={profilePath}
                                        className="hidden min-w-0 items-center gap-2 rounded-full border border-borderGlass bg-surface px-3 py-1.5 transition-colors hover:border-accent/50 hover:bg-white/10 lg:flex"
                                        title={t('command.profile')}
                                    >
                                        <AvatarMark imageUrl={avatarPhotoUrl} alt={`Photo de ${displayName}`} letter={avatarLetter} />
                                        <span className="max-w-[92px] truncate text-sm text-white/90 xl:max-w-[140px]">{displayName}</span>
                                    </Link>
                                ) : (
                                    <div className="hidden min-w-0 items-center gap-2 rounded-full border border-borderGlass bg-surface px-3 py-1.5 lg:flex">
                                        <AvatarMark imageUrl={avatarPhotoUrl} alt={`Photo de ${displayName}`} letter={avatarLetter} />
                                        <span className="max-w-[92px] truncate text-sm text-white/90 xl:max-w-[140px]">{displayName}</span>
                                    </div>
                                )}

                                <Link
                                    to={roleCta.to}
                                    className={`hidden lg:inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                                        roleCta.accent
                                            ? 'bg-accent text-white border border-accent/80 hover:bg-accent/90 shadow-[0_0_20px_rgba(232,101,26,0.22)]'
                                            : 'bg-surface border border-borderGlass text-white/90 hover:border-accent/50 hover:bg-white/10'
                                    }`}
                                >
                                    {roleCta.label}
                                </Link>

                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="hidden lg:inline-flex items-center rounded-full bg-surface border border-borderGlass px-4 py-2 text-sm text-white/90 hover:border-accent/50 hover:bg-white/10 transition-all duration-300"
                                >
                                    {t('nav.logout')}
                                </button>
                            </>
                        )}

                        {!isAuthenticated && (
                            <>
                                <Link
                                    to="/auth?mode=register"
                                    className="hidden lg:inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(232,101,26,0.22)] transition-all duration-300 hover:bg-accent/90"
                                >
                                    {t('nav.signup')}
                                </Link>
                                <Link
                                    to="/auth"
                                    className="hidden lg:inline-flex items-center rounded-full bg-surface border border-borderGlass px-5 py-2.5 text-sm text-white/90 hover:border-accent/50 hover:bg-white/10 transition-all duration-300"
                                >
                                    {t('nav.login')}
                                </Link>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={() => setMenuOpen((prev) => !prev)}
                            className="inline-flex lg:hidden items-center justify-center rounded-full border border-borderGlass bg-surface p-2.5 text-white/90 hover:border-accent/50"
                            aria-label={t('nav.menu')}
                        >
                            {menuOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="lg:hidden mt-4 rounded-2xl border border-borderGlass bg-deepNavy/90 backdrop-blur-xl p-4"
                        >
                            <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={openCommandPalette}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-borderGlass bg-white/5 px-3 py-2.5 text-sm text-white/85"
                                        aria-label={t('toolbar.command')}
                                    >
                                        <Search size={16} />
                                        {t('command.hint')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={toggleTheme}
                                        className="inline-flex items-center justify-center rounded-xl border border-borderGlass bg-white/5 px-3 py-2.5 text-white/85"
                                        aria-label={theme === 'dark' ? t('toolbar.theme.light') : t('toolbar.theme.dark')}
                                    >
                                        <ThemeIcon size={16} />
                                    </button>
                                    <label className="inline-flex items-center justify-center gap-2 rounded-xl border border-borderGlass bg-white/5 px-3 py-2.5 text-white/85">
                                        <Languages size={16} />
                                        <select
                                            value={language}
                                            onChange={(event) => setLanguage(event.target.value)}
                                            className="w-12 bg-transparent text-sm font-semibold outline-none"
                                            aria-label={t('toolbar.language')}
                                        >
                                            {Object.values(languages).map((item) => (
                                                <option key={item.code} value={item.code} className="bg-deepNavy text-white">
                                                    {item.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                {centerLinks.map((item) => (
                                    <Link
                                        key={item.label}
                                        to={item.to}
                                        onClick={() => setMenuOpen(false)}
                                        className="rounded-xl px-3 py-2 text-white/85 hover:bg-white/10 transition-colors"
                                    >
                                        {item.label}
                                    </Link>
                                ))}

                                {isAuthenticated && (
                                    <>
                                        {profilePath ? (
                                            <Link
                                                to={profilePath}
                                                onClick={() => setMenuOpen(false)}
                                                className="mt-1 flex items-center gap-2 rounded-xl border border-borderGlass bg-surface px-3 py-2.5 transition-colors hover:border-accent/50 hover:bg-white/10"
                                            >
                                                <AvatarMark imageUrl={avatarPhotoUrl} alt={`Photo de ${displayName}`} letter={avatarLetter} />
                                                <span className="text-sm text-white/90">{displayName}</span>
                                            </Link>
                                        ) : (
                                            <div className="mt-1 flex items-center gap-2 rounded-xl border border-borderGlass bg-surface px-3 py-2.5">
                                                <AvatarMark imageUrl={avatarPhotoUrl} alt={`Photo de ${displayName}`} letter={avatarLetter} />
                                                <span className="text-sm text-white/90">{displayName}</span>
                                            </div>
                                        )}

                                        <Link
                                            to={roleCta.to}
                                            onClick={() => setMenuOpen(false)}
                                            className="rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
                                        >
                                            {roleCta.label}
                                        </Link>

                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="rounded-xl border border-borderGlass bg-white/5 px-3 py-2.5 text-left text-sm text-white/90 hover:bg-white/10 transition-colors"
                                        >
                                            {t('nav.logout')}
                                        </button>
                                    </>
                                )}

                                {!isAuthenticated && (
                                    <>
                                        <Link
                                            to="/auth?mode=register"
                                            onClick={() => setMenuOpen(false)}
                                            className="rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
                                        >
                                            {t('nav.signup')}
                                        </Link>
                                        <Link
                                            to="/auth"
                                            onClick={() => setMenuOpen(false)}
                                            className="rounded-xl border border-borderGlass bg-white/5 px-3 py-2.5 text-sm text-white/90 hover:bg-white/10 transition-colors"
                                        >
                                            {t('nav.login')}
                                        </Link>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.nav>
    );
}
