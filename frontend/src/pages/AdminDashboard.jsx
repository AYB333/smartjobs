import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    Briefcase,
    Calendar,
    CheckCircle2,
    RefreshCw,
    Shield,
    Users,
    UserCheck,
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

const roleBadgeClasses = {
    candidat: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
    recruteur: 'bg-orange-500/15 text-orange-300 border-orange-400/30',
    admin: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
};

function extractList(payload) {
    const source = payload?.data;

    if (Array.isArray(source?.data)) {
        return source.data;
    }

    if (Array.isArray(source)) {
        return source;
    }

    return [];
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

function getOfferStatus(offer) {
    if (!offer) {
        return 'expired';
    }

    if (offer.status === 'suspended') {
        return 'suspended';
    }

    const expiresAt = offer.expires_at ? new Date(offer.expires_at) : null;
    if (expiresAt && !Number.isNaN(expiresAt.getTime())) {
        expiresAt.setHours(23, 59, 59, 999);
        if (expiresAt < new Date()) {
            return 'expired';
        }
    }

    return offer.status || 'active';
}

function readableStatus(status) {
    if (status === 'active') return 'Active';
    if (status === 'expired') return 'Expiree';
    if (status === 'suspended') return 'Suspendue';
    return status || '-';
}

function readableRole(role) {
    if (role === 'candidat') return 'Candidat';
    if (role === 'recruteur') return 'Recruteur';
    if (role === 'admin') return 'Admin';
    return role || '-';
}

function getRecruiterName(offer) {
    return (
        offer?.recruteur?.recruteur_profile?.nom_etablissement
        || offer?.recruteur?.recruteurProfile?.nom_etablissement
        || offer?.recruteur?.name
        || 'Recruteur'
    );
}

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [offers, setOffers] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const [error, setError] = useState('');

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const [statsResponse, offersResponse, usersResponse] = await Promise.all([
                api.get('/admin/stats'),
                api.get('/offres', { params: { include_all_statuses: 1, limit: 100 } }),
                api.get('/admin/users'),
            ]);

            setStats(statsResponse?.data?.data ?? {});
            setOffers(extractList(offersResponse?.data));
            setUsers(extractList(usersResponse?.data));
        } catch (requestError) {
            setError(
                requestError?.response?.data?.message
                || "Impossible de charger le dashboard admin."
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

    const statCards = useMemo(() => ([
        {
            label: 'Offres actives',
            value: stats?.total_offres_actives ?? stats?.total_offres ?? 0,
            icon: Briefcase,
        },
        {
            label: 'Candidats',
            value: stats?.total_candidats ?? 0,
            icon: UserCheck,
        },
        {
            label: 'Recruteurs',
            value: stats?.total_recruteurs ?? 0,
            icon: Users,
        },
        {
            label: 'Candidatures',
            value: stats?.total_candidatures ?? 0,
            icon: CheckCircle2,
        },
    ]), [stats]);

    const updateOfferStatus = async (offerId, status) => {
        setActionLoading((current) => ({ ...current, [offerId]: true }));
        setError('');

        try {
            await api.patch(`/admin/offers/${offerId}/status`, { status });
            setOffers((currentOffers) => currentOffers.map((offer) => (
                offer.id === offerId ? { ...offer, status } : offer
            )));

            const statsResponse = await api.get('/admin/stats');
            setStats(statsResponse?.data?.data ?? {});
        } catch (requestError) {
            setError(
                requestError?.response?.data?.message
                || "Impossible de mettre a jour le statut de l'offre."
            );
        } finally {
            setActionLoading((current) => ({ ...current, [offerId]: false }));
        }
    };

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
                        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                            <Shield size={13} />
                            Console admin
                        </p>
                        <h1 className="text-3xl md:text-4xl font-black text-white">Dashboard Admin</h1>
                        <p className="text-white/60 mt-2">
                            Pilotage global, moderation des offres et suivi des comptes.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={loadDashboard}
                        className="inline-flex w-fit items-center gap-2 rounded-full border border-borderGlass bg-surface px-5 py-2.5 text-sm text-white/80 hover:text-white hover:border-accent/50 transition-colors"
                    >
                        <RefreshCw size={16} />
                        Actualiser
                    </button>
                </motion.div>

                {error && (
                    <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-200">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="rounded-3xl border border-borderGlass bg-surface px-6 py-16 text-center">
                        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                        <p className="text-white/60">Chargement du dashboard admin...</p>
                    </div>
                ) : (
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
                        className="space-y-8"
                    >
                        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {statCards.map((stat) => {
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
                            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Moderation des offres</h2>
                                    <p className="text-white/55 text-sm mt-1">
                                        Tous les statuts sont visibles pour suspension ou reactivation.
                                    </p>
                                </div>
                                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-3 py-1.5 text-xs text-white/60">
                                    <AlertTriangle size={13} className="text-accent" />
                                    {offers.length} offres
                                </span>
                            </div>

                            {offers.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-borderGlass px-5 py-10 text-center text-white/55">
                                    Aucune offre disponible.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-borderGlass text-xs uppercase tracking-wider text-white/50">
                                                <th className="px-4 py-3 font-semibold">titre_poste</th>
                                                <th className="px-4 py-3 font-semibold">recruteur</th>
                                                <th className="px-4 py-3 font-semibold">ville</th>
                                                <th className="px-4 py-3 font-semibold">status</th>
                                                <th className="px-4 py-3 font-semibold">expires_at</th>
                                                <th className="px-4 py-3 font-semibold">actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {offers.map((offer) => {
                                                const offerStatus = getOfferStatus(offer);
                                                const isBusy = Boolean(actionLoading[offer.id]);

                                                return (
                                                    <tr key={offer.id} className="border-b border-white/5 align-top text-white/80">
                                                        <td className="px-4 py-4">
                                                            <p className="font-semibold text-white">{offer.titre_poste || '-'}</p>
                                                            <p className="mt-1 text-xs text-white/45">{offer.type_contrat || '-'}</p>
                                                        </td>
                                                        <td className="px-4 py-4">{getRecruiterName(offer)}</td>
                                                        <td className="px-4 py-4">{offer.ville || '-'}</td>
                                                        <td className="px-4 py-4">
                                                            <span
                                                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                                                    statusBadgeClasses[offerStatus] || 'bg-white/10 text-white/80 border-white/25'
                                                                }`}
                                                            >
                                                                {readableStatus(offerStatus)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <span className="inline-flex items-center gap-1.5 text-white/75">
                                                                <Calendar size={14} className="text-accent" />
                                                                {formatDate(offer.expires_at)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex flex-wrap gap-2">
                                                                {offerStatus === 'active' ? (
                                                                    <button
                                                                        type="button"
                                                                        disabled={isBusy}
                                                                        onClick={() => updateOfferStatus(offer.id, 'suspended')}
                                                                        className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                                    >
                                                                        Suspendre
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        disabled={isBusy}
                                                                        onClick={() => updateOfferStatus(offer.id, 'active')}
                                                                        className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                                    >
                                                                        Activer
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        <section className="rounded-3xl border border-borderGlass bg-surface p-6 md:p-8">
                            <div className="mb-5">
                                <h2 className="text-xl font-bold text-white">Gestion des utilisateurs</h2>
                                <p className="text-white/55 text-sm mt-1">
                                    Comptes candidats, recruteurs et administrateurs.
                                </p>
                            </div>

                            {users.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-borderGlass px-5 py-10 text-center text-white/55">
                                    Aucun utilisateur disponible.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-borderGlass text-xs uppercase tracking-wider text-white/50">
                                                <th className="px-4 py-3 font-semibold">name</th>
                                                <th className="px-4 py-3 font-semibold">email</th>
                                                <th className="px-4 py-3 font-semibold">role</th>
                                                <th className="px-4 py-3 font-semibold">created_at</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user) => (
                                                <tr key={user.id} className="border-b border-white/5 text-white/80">
                                                    <td className="px-4 py-4 font-semibold text-white">{user.name || '-'}</td>
                                                    <td className="px-4 py-4">{user.email || '-'}</td>
                                                    <td className="px-4 py-4">
                                                        <span
                                                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                                                roleBadgeClasses[user.role] || 'bg-white/10 text-white/80 border-white/25'
                                                            }`}
                                                        >
                                                            {readableRole(user.role)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">{formatDate(user.created_at)}</td>
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
