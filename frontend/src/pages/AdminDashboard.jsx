import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    BarChart3,
    Briefcase,
    Calendar,
    CheckCircle2,
    Filter,
    LayoutDashboard,
    RefreshCw,
    Search,
    Shield,
    Users,
    UserCheck,
    UserCog,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { useToast } from '../context/useAppExperience';

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

function AnalyticsBar({ label, value, total, tone = 'accent' }) {
    const percent = total > 0 ? Math.round((value / total) * 100) : 0;
    const toneClass = {
        accent: 'bg-accent',
        emerald: 'bg-emerald-400',
        amber: 'bg-amber-400',
        rose: 'bg-rose-400',
        sky: 'bg-sky-400',
    }[tone];

    return (
        <div>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-white/75">{label}</span>
                <span className="text-white/55">{value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${toneClass}`} style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}

function normalizeSearch(value) {
    return String(value ?? '').trim().toLowerCase();
}

export default function AdminDashboard() {
    const { showToast } = useToast();
    const [stats, setStats] = useState(null);
    const [offers, setOffers] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [offerSearch, setOfferSearch] = useState('');
    const [offerStatusFilter, setOfferStatusFilter] = useState('all');
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('all');
    const [suspensionTarget, setSuspensionTarget] = useState(null);
    const [suspensionReason, setSuspensionReason] = useState('');

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

    const offerStatusCounts = useMemo(() => offers.reduce((counts, offer) => {
        const status = getOfferStatus(offer);
        return {
            ...counts,
            [status]: (counts[status] ?? 0) + 1,
        };
    }, { active: 0, expired: 0, suspended: 0 }), [offers]);

    const userRoleCounts = useMemo(() => users.reduce((counts, user) => {
        const role = user?.role || 'unknown';
        return {
            ...counts,
            [role]: (counts[role] ?? 0) + 1,
        };
    }, { candidat: 0, recruteur: 0, admin: 0 }), [users]);

    const filteredOffers = useMemo(() => {
        const query = normalizeSearch(offerSearch);

        return offers.filter((offer) => {
            const status = getOfferStatus(offer);
            const matchesStatus = offerStatusFilter === 'all' || status === offerStatusFilter;
            const matchesSearch = !query || [
                offer?.titre_poste,
                offer?.ville,
                offer?.type_contrat,
                getRecruiterName(offer),
            ].some((value) => normalizeSearch(value).includes(query));

            return matchesStatus && matchesSearch;
        });
    }, [offerSearch, offerStatusFilter, offers]);

    const filteredUsers = useMemo(() => {
        const query = normalizeSearch(userSearch);

        return users.filter((user) => {
            const matchesRole = userRoleFilter === 'all' || user?.role === userRoleFilter;
            const matchesSearch = !query || [
                user?.name,
                user?.email,
                user?.role,
            ].some((value) => normalizeSearch(value).includes(query));

            return matchesRole && matchesSearch;
        });
    }, [userRoleFilter, userSearch, users]);

    const tabs = useMemo(() => ([
        {
            id: 'overview',
            label: 'Vue globale',
            icon: LayoutDashboard,
        },
        {
            id: 'offers',
            label: 'Offres',
            count: offers.length,
            icon: Briefcase,
        },
        {
            id: 'users',
            label: 'Utilisateurs',
            count: users.length,
            icon: UserCog,
        },
    ]), [offers.length, users.length]);

    const updateOfferStatus = async (offerId, status, suspensionReasonValue = '') => {
        setActionLoading((current) => ({ ...current, [offerId]: true }));
        setError('');

        try {
            const payload = status === 'suspended'
                ? { status, suspension_reason: suspensionReasonValue.trim() || null }
                : { status };
            const response = await api.patch(`/admin/offers/${offerId}/status`, payload);
            const updatedOffer = response?.data?.data ?? {};

            setOffers((currentOffers) => currentOffers.map((offer) => (
                offer.id === offerId
                    ? {
                        ...offer,
                        ...updatedOffer,
                        status,
                        suspension_reason: status === 'suspended'
                            ? updatedOffer.suspension_reason ?? payload.suspension_reason
                            : null,
                    }
                    : offer
            )));

            const statsResponse = await api.get('/admin/stats');
            setStats(statsResponse?.data?.data ?? {});
            showToast({
                type: 'success',
                title: 'Moderation',
                message: status === 'active' ? 'Offre activee.' : 'Offre suspendue.',
            });

            return true;
        } catch (requestError) {
            const message =
                requestError?.response?.data?.message
                || "Impossible de mettre a jour le statut de l'offre.";
            setError(message);
            showToast({
                type: 'error',
                title: 'Moderation',
                message,
            });

            return false;
        } finally {
            setActionLoading((current) => ({ ...current, [offerId]: false }));
        }
    };

    const openSuspensionDialog = (offer) => {
        setSuspensionTarget(offer);
        setSuspensionReason(offer?.suspension_reason || '');
    };

    const closeSuspensionDialog = () => {
        setSuspensionTarget(null);
        setSuspensionReason('');
    };

    const confirmSuspension = async (event) => {
        event.preventDefault();

        if (!suspensionTarget) {
            return;
        }

        const saved = await updateOfferStatus(suspensionTarget.id, 'suspended', suspensionReason);

        if (saved) {
            closeSuspensionDialog();
        }
    };

    const suspensionBusy = suspensionTarget ? Boolean(actionLoading[suspensionTarget.id]) : false;

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

                        <section className="rounded-3xl border border-borderGlass bg-surface p-2">
                            <div className="grid gap-2 md:grid-cols-3">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const active = activeTab === tab.id;

                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                                                active
                                                    ? 'bg-accent text-white'
                                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                                            }`}
                                        >
                                            <Icon size={16} />
                                            {tab.label}
                                            {typeof tab.count === 'number' && (
                                                <span className={`rounded-full px-2 py-0.5 text-xs ${
                                                    active ? 'bg-white/20 text-white' : 'bg-white/10 text-white/55'
                                                }`}
                                                >
                                                    {tab.count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {activeTab === 'overview' && (
                            <>
                            <section className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-3xl border border-borderGlass bg-surface p-6">
                                    <div className="mb-5 flex items-center gap-3">
                                        <span className="rounded-xl bg-accent/10 p-3 text-accent">
                                            <BarChart3 size={20} />
                                        </span>
                                        <div>
                                            <h2 className="text-lg font-bold text-white">Offres par statut</h2>
                                            <p className="text-sm text-white/50">Vue rapide de la moderation.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <AnalyticsBar label="Actives" value={offerStatusCounts.active} total={offers.length} tone="emerald" />
                                        <AnalyticsBar label="Suspendues" value={offerStatusCounts.suspended} total={offers.length} tone="amber" />
                                        <AnalyticsBar label="Expirees" value={offerStatusCounts.expired} total={offers.length} tone="rose" />
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-borderGlass bg-surface p-6">
                                    <div className="mb-5 flex items-center gap-3">
                                        <span className="rounded-xl bg-sky-500/10 p-3 text-sky-300">
                                            <Users size={20} />
                                        </span>
                                        <div>
                                            <h2 className="text-lg font-bold text-white">Utilisateurs par role</h2>
                                            <p className="text-sm text-white/50">Equilibre candidats, recruteurs et admin.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <AnalyticsBar label="Candidats" value={userRoleCounts.candidat} total={users.length} tone="sky" />
                                        <AnalyticsBar label="Recruteurs" value={userRoleCounts.recruteur} total={users.length} tone="accent" />
                                        <AnalyticsBar label="Admins" value={userRoleCounts.admin} total={users.length} tone="rose" />
                                    </div>
                                </div>
                            </section>

                            <section className="grid gap-4 lg:grid-cols-3">
                                <div className="rounded-3xl border border-borderGlass bg-surface p-6">
                                    <div className="mb-4 inline-flex rounded-xl bg-accent/10 p-3 text-accent">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <h2 className="text-lg font-bold text-white">Moderation a surveiller</h2>
                                    <p className="mt-2 text-sm text-white/55">
                                        {offerStatusCounts.suspended} offres suspendues et {offerStatusCounts.expired} expirees.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('offers')}
                                        className="mt-5 inline-flex items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:border-accent/50 hover:text-white"
                                    >
                                        Ouvrir moderation
                                    </button>
                                </div>

                                <div className="rounded-3xl border border-borderGlass bg-surface p-6">
                                    <div className="mb-4 inline-flex rounded-xl bg-emerald-500/10 p-3 text-emerald-300">
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <h2 className="text-lg font-bold text-white">Plateforme active</h2>
                                    <p className="mt-2 text-sm text-white/55">
                                        {offerStatusCounts.active} offres actives pour {userRoleCounts.candidat} candidats.
                                    </p>
                                    <p className="mt-4 text-xs uppercase tracking-wider text-white/40">
                                        Objectif: garder des offres recentes et exploitables.
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-borderGlass bg-surface p-6">
                                    <div className="mb-4 inline-flex rounded-xl bg-sky-500/10 p-3 text-sky-300">
                                        <Users size={20} />
                                    </div>
                                    <h2 className="text-lg font-bold text-white">Comptes utilisateurs</h2>
                                    <p className="mt-2 text-sm text-white/55">
                                        {userRoleCounts.recruteur} recruteurs, {userRoleCounts.candidat} candidats et {userRoleCounts.admin} admins.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('users')}
                                        className="mt-5 inline-flex items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:border-accent/50 hover:text-white"
                                    >
                                        Gérer les utilisateurs
                                    </button>
                                </div>
                            </section>
                            </>
                        )}

                        {activeTab === 'offers' && (
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
                                    {filteredOffers.length}/{offers.length} offres
                                </span>
                            </div>

                            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
                                <label className="relative">
                                    <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
                                    <input
                                        value={offerSearch}
                                        onChange={(event) => setOfferSearch(event.target.value)}
                                        className="w-full rounded-2xl border border-borderGlass bg-obsidian/60 py-3 pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-accent/50"
                                        placeholder="Chercher par poste, recruteur ou ville"
                                    />
                                </label>
                                <label className="relative">
                                    <Filter size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
                                    <select
                                        value={offerStatusFilter}
                                        onChange={(event) => setOfferStatusFilter(event.target.value)}
                                        className="w-full min-w-44 rounded-2xl border border-borderGlass bg-obsidian/60 py-3 pl-11 pr-4 text-sm text-white outline-none transition-colors focus:border-accent/50"
                                    >
                                        <option value="all">Tous statuts</option>
                                        <option value="active">Actives</option>
                                        <option value="expired">Expirees</option>
                                        <option value="suspended">Suspendues</option>
                                    </select>
                                </label>
                            </div>

                            {filteredOffers.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-borderGlass px-5 py-10 text-center text-white/55">
                                    Aucune offre ne correspond aux filtres.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-borderGlass text-xs uppercase tracking-wider text-white/50">
                                                <th className="px-4 py-3 font-semibold">Poste</th>
                                                <th className="px-4 py-3 font-semibold">Recruteur</th>
                                                <th className="px-4 py-3 font-semibold">Ville</th>
                                                <th className="px-4 py-3 font-semibold">Statut</th>
                                                <th className="px-4 py-3 font-semibold">Expiration</th>
                                                <th className="px-4 py-3 font-semibold">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredOffers.map((offer) => {
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
                                                            {offerStatus === 'suspended' && offer.suspension_reason && (
                                                                <p className="mt-2 max-w-[240px] text-xs leading-5 text-amber-100/75">
                                                                    <span className="font-semibold text-amber-200">Motif:</span> {offer.suspension_reason}
                                                                </p>
                                                            )}
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
                                                                        onClick={() => openSuspensionDialog(offer)}
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
                        )}

                        {activeTab === 'users' && (
                        <section className="rounded-3xl border border-borderGlass bg-surface p-6 md:p-8">
                            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Gestion des utilisateurs</h2>
                                    <p className="text-white/55 text-sm mt-1">
                                        Comptes candidats, recruteurs et administrateurs.
                                    </p>
                                </div>
                                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-3 py-1.5 text-xs text-white/60">
                                    <Users size={13} className="text-accent" />
                                    {filteredUsers.length}/{users.length} comptes
                                </span>
                            </div>

                            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
                                <label className="relative">
                                    <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
                                    <input
                                        value={userSearch}
                                        onChange={(event) => setUserSearch(event.target.value)}
                                        className="w-full rounded-2xl border border-borderGlass bg-obsidian/60 py-3 pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-accent/50"
                                        placeholder="Chercher par nom, email ou role"
                                    />
                                </label>
                                <label className="relative">
                                    <Filter size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
                                    <select
                                        value={userRoleFilter}
                                        onChange={(event) => setUserRoleFilter(event.target.value)}
                                        className="w-full min-w-44 rounded-2xl border border-borderGlass bg-obsidian/60 py-3 pl-11 pr-4 text-sm text-white outline-none transition-colors focus:border-accent/50"
                                    >
                                        <option value="all">Tous roles</option>
                                        <option value="candidat">Candidats</option>
                                        <option value="recruteur">Recruteurs</option>
                                        <option value="admin">Admins</option>
                                    </select>
                                </label>
                            </div>

                            {filteredUsers.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-borderGlass px-5 py-10 text-center text-white/55">
                                    Aucun utilisateur ne correspond aux filtres.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-borderGlass text-xs uppercase tracking-wider text-white/50">
                                                <th className="px-4 py-3 font-semibold">Nom</th>
                                                <th className="px-4 py-3 font-semibold">Email</th>
                                                <th className="px-4 py-3 font-semibold">Role</th>
                                                <th className="px-4 py-3 font-semibold">Creation</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers.map((user) => (
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
                        )}
                    </motion.div>
                )}
            </main>

            {suspensionTarget && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
                    <motion.form
                        initial={{ opacity: 0, y: 18, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        onSubmit={confirmSuspension}
                        className="w-full max-w-lg rounded-3xl border border-borderGlass bg-deepNavy p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
                    >
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-200">
                                    <AlertTriangle size={13} />
                                    Moderation
                                </p>
                                <h2 className="text-xl font-bold text-white">Motif de suspension</h2>
                                <p className="mt-1 text-sm text-white/55">
                                    {suspensionTarget.titre_poste || 'Offre selectionnee'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeSuspensionDialog}
                                disabled={suspensionBusy}
                                className="rounded-full border border-borderGlass bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/65 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Fermer
                            </button>
                        </div>

                        <label className="block">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/45">
                                Motif de suspension
                            </span>
                            <textarea
                                value={suspensionReason}
                                onChange={(event) => setSuspensionReason(event.target.value)}
                                maxLength={500}
                                rows={4}
                                className="w-full resize-none rounded-2xl border border-borderGlass bg-obsidian/70 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-amber-400/50"
                                placeholder="Ex: Informations insuffisantes, contenu non conforme..."
                            />
                        </label>

                        <p className="mt-2 text-xs text-white/40">
                            Optionnel. Si vous reactivez l'offre, ce motif sera efface automatiquement.
                        </p>

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeSuspensionDialog}
                                disabled={suspensionBusy}
                                className="rounded-full border border-borderGlass bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={suspensionBusy}
                                className="rounded-full border border-amber-400/35 bg-amber-500/20 px-5 py-2.5 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {suspensionBusy ? 'Suspension...' : 'Confirmer la suspension'}
                            </button>
                        </div>
                    </motion.form>
                </div>
            )}
        </motion.div>
    );
}
