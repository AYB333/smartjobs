import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

function parseStoredUser() {
    try {
        const rawUser = localStorage.getItem('user');
        return rawUser ? JSON.parse(rawUser) : null;
    } catch {
        return null;
    }
}

function getCenterLinks(role, isAuthenticated) {
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
        return unique([{ label: 'Voir les offres', to: '/jobs' }]);
    }

    if (role === 'recruteur') {
        return unique([
            { label: 'Dashboard', to: '/recruteur/dashboard' },
            { label: 'Mes Offres', to: '/recruteur/dashboard' },
        ]);
    }

    if (role === 'candidat') {
        return unique([
            { label: 'Dashboard', to: '/candidat/dashboard' },
            { label: 'Mon Profil', to: '/candidat/profile' },
            { label: 'Voir les offres', to: '/jobs' },
        ]);
    }

    return unique([
        { label: 'Dashboard', to: '/admin/dashboard' },
        { label: 'Voir les offres', to: '/jobs' },
    ]);
}

function getRoleCta(role, isAuthenticated) {
    if (!isAuthenticated) {
        return { label: 'Connexion', to: '/auth', accent: false };
    }

    if (role === 'recruteur') {
        return { label: 'Creer une offre', to: '/recruteur/offer/create', accent: true };
    }

    if (role === 'candidat') {
        return { label: 'Mes candidatures', to: '/candidat/dashboard', accent: true };
    }

    return { label: 'Gestion admin', to: '/admin/dashboard', accent: true };
}

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(() => parseStoredUser());
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

    const isAuthenticated = Boolean(currentUser);
    const role = currentUser?.role || '';
    const displayName = currentUser?.name || 'Utilisateur';
    const avatarLetter = displayName.trim().charAt(0).toUpperCase() || 'U';
    const centerLinks = useMemo(() => getCenterLinks(role, isAuthenticated), [role, isAuthenticated]);
    const roleCta = useMemo(() => getRoleCta(role, isAuthenticated), [role, isAuthenticated]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setCurrentUser(null);
        setMenuOpen(false);
        navigate('/auth', { replace: true });
    };

    const navLinkClass = 'text-sm font-medium tracking-[0.02em] text-white/70 hover:text-white transition-colors relative group whitespace-nowrap';
    const navUnderlineClass = 'absolute -bottom-1 left-0 w-0 h-[2px] bg-accent transition-all duration-300 ease-out group-hover:w-full';

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

                    <div className="hidden min-w-0 items-center justify-center gap-4 lg:flex xl:gap-8">
                        {centerLinks.map((item) => (
                            <Link key={item.label} to={item.to} className={navLinkClass}>
                                {item.label}
                                <span className={navUnderlineClass}></span>
                            </Link>
                        ))}
                    </div>

                    <div className="flex min-w-0 items-center justify-end gap-2 md:gap-3">
                        {isAuthenticated && (
                            <>
                                <div className="hidden min-w-0 items-center gap-2 rounded-full border border-borderGlass bg-surface px-3 py-1.5 md:flex">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                                        {avatarLetter}
                                    </span>
                                    <span className="max-w-[92px] truncate text-sm text-white/90 xl:max-w-[140px]">{displayName}</span>
                                </div>

                                <Link
                                    to={roleCta.to}
                                    className={`hidden md:inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
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
                                    className="hidden md:inline-flex items-center rounded-full bg-surface border border-borderGlass px-4 py-2 text-sm text-white/90 hover:border-accent/50 hover:bg-white/10 transition-all duration-300"
                                >
                                    Deconnexion
                                </button>
                            </>
                        )}

                        {!isAuthenticated && (
                            <Link
                                to="/auth"
                                className="hidden md:inline-flex items-center rounded-full bg-surface border border-borderGlass px-5 py-2.5 text-sm text-white/90 hover:border-accent/50 hover:bg-white/10 transition-all duration-300"
                            >
                                Connexion
                            </Link>
                        )}

                        <button
                            type="button"
                            onClick={() => setMenuOpen((prev) => !prev)}
                            className="inline-flex md:hidden items-center justify-center rounded-full border border-borderGlass bg-surface p-2.5 text-white/90 hover:border-accent/50"
                            aria-label="Ouvrir le menu"
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
                            className="md:hidden mt-4 rounded-2xl border border-borderGlass bg-deepNavy/90 backdrop-blur-xl p-4"
                        >
                            <div className="flex flex-col gap-3">
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
                                        <div className="mt-1 flex items-center gap-2 rounded-xl border border-borderGlass bg-surface px-3 py-2.5">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                                                {avatarLetter}
                                            </span>
                                            <span className="text-sm text-white/90">{displayName}</span>
                                        </div>

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
                                            Deconnexion
                                        </button>
                                    </>
                                )}

                                {!isAuthenticated && (
                                    <Link
                                        to="/auth"
                                        onClick={() => setMenuOpen(false)}
                                        className="rounded-xl border border-borderGlass bg-white/5 px-3 py-2.5 text-sm text-white/90 hover:bg-white/10 transition-colors"
                                    >
                                        Connexion
                                    </Link>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.nav>
    );
}
