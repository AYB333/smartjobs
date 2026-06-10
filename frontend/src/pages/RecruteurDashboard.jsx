import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    ArrowUpRight,
    Briefcase,
    Calendar,
    Crown,
    Edit3,
    Eye,
    MapPin,
    Plus,
    RefreshCw,
    Users,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
};

const statusBadgeClasses = {
    active: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    expired: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
    suspended: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
};

function extractOffersList(payload) {
    const paginated = payload?.data;

    if (Array.isArray(paginated?.data)) {
        return paginated.data;
    }

    if (Array.isArray(paginated)) {
        return paginated;
    }

    return [];
}

function parseStoredUser() {
    try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function formatDate(dateString) {
    if (!dateString) {
        return '-';
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString('fr-FR');
}

function toReadableStatus(status) {
    if (status === 'active') return 'Active';
    if (status === 'expired') return 'Expiree';
    if (status === 'suspended') return 'Suspendue';
    return status ?? '-';
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

export default function RecruteurDashboard() {
    const [offers, setOffers] = useState([]);
    const [currentUser, setCurrentUser] = useState(() => parseStoredUser());
    const [subscription, setSubscription] = useState({
        is_premium: false,
        expires_at: null,
        days_remaining: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const [offersResponse, subscriptionResponse, meResponse] = await Promise.all([
                api.get('/mes-offres'),
                api.get('/payment/subscription').catch(() => null),
                api.get('/auth/me').catch(() => null),
            ]);

            setOffers(extractOffersList(offersResponse?.data));

            if (subscriptionResponse?.data?.data) {
                setSubscription(subscriptionResponse.data.data);
            }

            if (meResponse?.data?.user) {
                setCurrentUser(meResponse.data.user);
                localStorage.setItem('user', JSON.stringify(meResponse.data.user));
            }
        } catch (requestError) {
            setError(
                requestError?.response?.data?.message
                || "Impossible de charger le dashboard recruteur."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadDashboard();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [loadDashboard]);

    const stats = useMemo(() => {
        const activeOffers = offers.filter((offer) => offer.status === 'active').length;
        const totalApplications = offers.reduce((accumulator, offer) => accumulator + getApplicationsCount(offer), 0);
        const viewsToday = Number(currentUser?.vues_aujourdhui ?? 0);

        return [
            {
                label: 'Offres actives',
                value: activeOffers,
                icon: Briefcase,
            },
            {
                label: 'Candidatures recues',
                value: totalApplications,
                icon: Users,
            },
            {
                label: "Vues aujourd'hui",
                value: viewsToday,
                icon: Eye,
            },
        ];
    }, [offers, currentUser]);

    const isPremium = Boolean(subscription?.is_premium);
    const dailyLimit = 1;
    const viewsToday = Number(currentUser?.vues_aujourdhui ?? 0);
    const quotaUsed = Math.min(viewsToday, dailyLimit);
    const quotaProgress = Math.min((quotaUsed / dailyLimit) * 100, 100);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-obsidian"
        >
            <Navbar />

            <main className="container mx-auto px-6 pt-32 pb-16">
                <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
                >
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-white">Dashboard Recruteur</h1>
                        <p className="text-white/60 mt-2">
                            Suivi des offres, quota de consultation et performance recrutement.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link
                            to="/recruteur/offer/create"
                            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
                        >
                            <Plus size={16} />
                            Creer une offre
                        </Link>
                        <button
                            type="button"
                            onClick={loadDashboard}
                            className="inline-flex items-center gap-2 rounded-full border border-borderGlass bg-surface px-5 py-2.5 text-sm text-white/80 hover:text-white hover:border-accent/50 transition-colors"
                        >
                            <RefreshCw size={16} />
                            Actualiser
                        </button>
                    </div>
                </motion.div>

                {error && (
                    <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-200">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="rounded-3xl border border-borderGlass bg-surface px-6 py-16 text-center">
                        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                        <p className="text-white/60">Chargement du dashboard...</p>
                    </div>
                ) : (
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
                        className="space-y-8"
                    >
                        <section className="grid gap-4 md:grid-cols-3">
                            {stats.map((stat) => {
                                const Icon = stat.icon;
                                return (
                                    <motion.div
                                        key={stat.label}
                                        variants={itemVariants}
                                        className="rounded-3xl border border-borderGlass bg-surface p-6"
                                    >
                                        <div className="mb-4 inline-flex rounded-xl bg-white/5 p-3 text-accent">
                                            <Icon size={20} />
                                        </div>
                                        <p className="text-3xl font-black text-white">{stat.value}</p>
                                        <p className="mt-1 text-sm uppercase tracking-wider text-white/55">{stat.label}</p>
                                    </motion.div>
                                );
                            })}
                        </section>

                        <section className="rounded-3xl border border-borderGlass bg-surface p-6 md:p-8">
                            <div className="mb-5 flex items-start justify-between gap-5">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Quota Premium</h2>
                                    <p className="text-white/55 mt-1 text-sm">
                                        Acces aux profils candidats et limite de consultation journaliere.
                                    </p>
                                </div>

                                {isPremium ? (
                                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-200">
                                        <Crown size={14} />
                                        Premium actif
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-amber-200">
                                        Quota limite
                                    </span>
                                )}
                            </div>

                            {isPremium ? (
                                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
                                    <p className="text-white text-sm">
                                        Votre abonnement premium est actif.
                                    </p>
                                    <p className="text-white/70 text-sm mt-1">
                                        Expire le <span className="text-white">{formatDate(subscription?.expires_at)}</span>
                                        {' '}({subscription?.days_remaining ?? 0} jours restants)
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-white/55">
                                            <span>Utilisation quota</span>
                                            <span>{quotaUsed}/{dailyLimit}</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                            <div
                                                className="h-full rounded-full bg-accent transition-all"
                                                style={{ width: `${quotaProgress}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-accent/30 bg-accent/10 p-5">
                                        <p className="text-white font-semibold">Passez Premium pour un acces illimite.</p>
                                        <p className="mt-1 text-sm text-white/75">
                                            Deverrouillez la consultation de profils sans restriction quotidienne.
                                        </p>
                                        <Link
                                            to="/recruteur/premium"
                                            className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
                                        >
                                            Voir les offres Premium
                                            <ArrowUpRight size={15} />
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </section>

                        <section className="rounded-3xl border border-borderGlass bg-surface p-6 md:p-8">
                            <div className="mb-5">
                                <h2 className="text-xl font-bold text-white">Mes offres</h2>
                                <p className="text-white/55 text-sm mt-1">
                                    Statut de publication et acces rapide aux candidatures.
                                </p>
                            </div>

                            {offers.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-borderGlass px-5 py-10 text-center text-white/55">
                                    Aucune offre publiee pour le moment.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-borderGlass text-xs uppercase tracking-wider text-white/50">
                                                <th className="px-4 py-3 font-semibold">Poste</th>
                                                <th className="px-4 py-3 font-semibold">Localisation</th>
                                                <th className="px-4 py-3 font-semibold">Echeance</th>
                                                <th className="px-4 py-3 font-semibold">Statut</th>
                                                <th className="px-4 py-3 font-semibold">Candidatures</th>
                                                <th className="px-4 py-3 font-semibold">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {offers.map((offer) => (
                                                <tr key={offer.id} className="border-b border-white/5 align-top text-white/80">
                                                    <td className="px-4 py-4">
                                                        <p className="font-semibold text-white">{offer.titre_poste}</p>
                                                        <p className="mt-1 text-xs text-white/45">{offer.type_contrat}</p>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="inline-flex items-center gap-1.5 text-white/75">
                                                            <MapPin size={14} className="text-accent" />
                                                            {offer.ville}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="inline-flex items-center gap-1.5 text-white/75">
                                                            <Calendar size={14} className="text-accent" />
                                                            {formatDate(offer.expires_at)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span
                                                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                                                statusBadgeClasses[offer.status] || 'bg-white/10 text-white/80 border-white/25'
                                                            }`}
                                                        >
                                                            {toReadableStatus(offer.status)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-white">{getApplicationsCount(offer)}</td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-wrap gap-2">
                                                            <Link
                                                                to={`/jobs/${offer.id}`}
                                                                className="rounded-full border border-borderGlass bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:text-white hover:border-accent/50 transition-colors"
                                                            >
                                                                Voir
                                                            </Link>
                                                            <Link
                                                                to={`/recruteur/candidatures?offer=${offer.id}`}
                                                                className="rounded-full border border-borderGlass bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:text-white hover:border-accent/50 transition-colors"
                                                            >
                                                                Candidatures
                                                            </Link>
                                                            <Link
                                                                to={`/recruteur/offer/edit/${offer.id}`}
                                                                className="inline-flex items-center gap-1 rounded-full border border-borderGlass bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:text-white hover:border-accent/50 transition-colors"
                                                            >
                                                                <Edit3 size={12} />
                                                                Modifier
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </motion.div>
                )}
            </main>
        </motion.div>
    );
}
