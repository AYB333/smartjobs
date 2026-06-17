import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import {
    ArrowRight,
    ArrowUpRight,
    Briefcase,
    Building2,
    Calendar,
    Crown,
    Edit3,
    MapPin,
    Plus,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { useI18n } from '../context/useAppExperience';

const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0 },
};

const offerStatusBadgeClasses = {
    active: 'bg-emerald-500/12 text-emerald-300 border-emerald-400/30',
    expired: 'bg-rose-500/12 text-rose-300 border-rose-400/30',
    suspended: 'bg-amber-500/12 text-amber-300 border-amber-400/30',
};

const applicationStatusBadgeClasses = {
    en_attente: 'bg-amber-500/12 text-amber-300 border-amber-400/30',
    acceptee: 'bg-emerald-500/12 text-emerald-300 border-emerald-400/30',
    refusee: 'bg-rose-500/12 text-rose-300 border-rose-400/30',
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

function toTimestamp(dateString) {
    if (!dateString) return 0;
    const time = new Date(dateString).getTime();
    return Number.isNaN(time) ? 0 : time;
}

function toReadableOfferStatus(status, t) {
    if (status === 'active') return t('status.active');
    if (status === 'expired') return t('status.expired');
    if (status === 'suspended') return t('status.suspended');
    return status ?? '-';
}

function toReadableApplicationStatus(status, t) {
    if (status === 'en_attente') return t('status.pending');
    if (status === 'acceptee') return t('status.accepted');
    if (status === 'refusee') return t('status.rejected');
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

function getRecruiterProfile(user) {
    return user?.recruteurProfile
        ?? user?.recruteur_profile
        ?? user?.profile
        ?? {};
}

function getInitials(value) {
    const initials = String(value || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    return initials || 'R';
}

function normalizeEstablishmentType(value) {
    if (value === 'cafe') return 'Cafe';
    if (value === 'hotel') return 'Hotel';
    if (value === 'restaurant') return 'Restaurant';
    return value || 'Etablissement';
}

function getApplicationCandidate(application) {
    return application?.candidat ?? {};
}

function getCandidateProfile(candidate) {
    return candidate?.candidatProfile ?? candidate?.candidat_profile ?? candidate?.profile ?? {};
}

function getRecentApplications(offers) {
    return offers
        .flatMap((offer) => (Array.isArray(offer?.applications) ? offer.applications : []).map((application) => ({
            ...application,
            offer,
        })))
        .sort((first, second) => toTimestamp(second?.created_at) - toTimestamp(first?.created_at))
        .slice(0, 5);
}

function SummaryRow({ label, value, tone = 'default' }) {
    const toneClass = {
        default: 'bg-white/35',
        active: 'bg-emerald-300',
        applications: 'bg-sky-300',
        quota: 'bg-accent',
    }[tone];

    return (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-borderGlass bg-white/5 px-4 py-3">
            <span className="flex items-center gap-3 text-sm text-white/70">
                <span className={`h-2.5 w-2.5 rounded-full ${toneClass}`} />
                {label}
            </span>
            <span className="text-base font-bold text-white">{value}</span>
        </div>
    );
}

export default function RecruteurDashboard() {
    const { t } = useI18n();
    const location = useLocation();
    const [offers, setOffers] = useState([]);
    const [currentUser, setCurrentUser] = useState(() => parseStoredUser());
    const [subscription, setSubscription] = useState({
        is_premium: false,
        expires_at: null,
        days_remaining: 0,
    });
    const [offerStatusFilter, setOfferStatusFilter] = useState('all');
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
                || 'Impossible de charger le dashboard recruteur.'
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

    useEffect(() => {
        if (location.hash !== '#mes-offres') {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            document.getElementById('mes-offres')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [location.hash]);

    const recruiterProfile = getRecruiterProfile(currentUser);
    const establishmentName = recruiterProfile?.nom_etablissement || currentUser?.name || t('recruiter.dashboard.establishmentFallback');
    const establishmentType = normalizeEstablishmentType(recruiterProfile?.type_etablissement);
    const establishmentCity = recruiterProfile?.ville || t('recruiter.dashboard.cityMissing');
    const avatarInitials = getInitials(recruiterProfile?.nom_etablissement || currentUser?.name);
    const firstName = currentUser?.name?.split(' ')?.[0] || currentUser?.name || 'recruteur';
    const firstOffer = offers[0] ?? null;
    const candidaturesUrl = firstOffer ? `/recruteur/candidatures?offer=${firstOffer.id}` : '/recruteur/candidatures';

    const activeOffers = offers.filter((offer) => offer.status === 'active').length;
    const totalApplications = offers.reduce((accumulator, offer) => accumulator + getApplicationsCount(offer), 0);
    const dailyLimit = 1;
    const isPremium = Boolean(subscription?.is_premium);
    const quota = subscription?.quota || {};
    const quotaUsed = isPremium ? 0 : Number(quota?.used ?? currentUser?.vues_aujourdhui ?? 0);
    const quotaRemaining = isPremium ? null : Math.max(Number(quota?.remaining ?? dailyLimit - quotaUsed), 0);
    const quotaResetAt = quota?.reset_at || null;
    const quotaResetLabel = quotaResetAt ? formatDate(quotaResetAt) : null;
    const viewsToday = quotaUsed;
    const quotaProgress = Math.min((quotaUsed / dailyLimit) * 100, 100);

    const filteredOffers = useMemo(() => {
        if (offerStatusFilter === 'all') {
            return offers;
        }

        return offers.filter((offer) => offer.status === offerStatusFilter);
    }, [offerStatusFilter, offers]);
    const offerFilters = useMemo(() => [
        { value: 'all', label: t('common.all') },
        { value: 'active', label: t('status.active') },
        { value: 'expired', label: t('status.expired') },
        { value: 'suspended', label: t('status.suspended') },
    ], [t]);

    const recentApplications = useMemo(() => getRecentApplications(offers), [offers]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-obsidian"
        >
            <Navbar />

            <main className="container mx-auto px-5 pt-28 pb-14 sm:px-6 lg:pt-32">
                {error && (
                    <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm font-medium text-rose-200">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="rounded-3xl border border-borderGlass bg-surface px-6 py-16 text-center">
                        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                        <p className="text-white/60">{t('common.loading')}</p>
                    </div>
                ) : (
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
                        className="space-y-6"
                    >
                        <motion.section
                            variants={itemVariants}
                            className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_55px_rgba(0,0,0,0.12)] md:p-7"
                        >
                            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-accent/25 bg-accent/12 text-xl font-black text-accent md:h-[72px] md:w-[72px]">
                                        {avatarInitials}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent">{t('recruiter.dashboard.kicker')}</p>
                                        <h1 className="text-3xl font-black leading-tight text-white md:text-4xl">{t('recruiter.dashboard.hello', { name: firstName })}</h1>
                                        <p className="mt-3 max-w-3xl text-base leading-relaxed text-white/62">
                                            {t('recruiter.dashboard.subtitle')}
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/65">
                                            <span className="rounded-full border border-borderGlass bg-white/5 px-3 py-1.5">{establishmentName}</span>
                                            <span className="rounded-full border border-borderGlass bg-white/5 px-3 py-1.5">{establishmentType}</span>
                                            <span className="rounded-full border border-borderGlass bg-white/5 px-3 py-1.5">{establishmentCity}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-borderGlass bg-white/5 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-white/45">{t('recruiter.dashboard.quickActions')}</p>
                                    <div className="mt-4 grid gap-2">
                                        <Link
                                            to="/recruteur/offer/create"
                                            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
                                        >
                                            <Plus size={16} />
                                            {t('recruiter.dashboard.createOffer')}
                                        </Link>
                                        <Link
                                            to={candidaturesUrl}
                                            className="inline-flex items-center justify-center gap-2 rounded-full border border-borderGlass bg-white/5 px-5 py-3 text-sm font-semibold text-white/75 transition-colors hover:border-accent/40 hover:text-white"
                                        >
                                            {t('recruiter.dashboard.viewApplications')}
                                            <ArrowRight size={15} />
                                        </Link>
                                        <Link
                                            to="/recruteur/profile"
                                            className="inline-flex items-center justify-center gap-2 rounded-full border border-borderGlass bg-white/5 px-5 py-3 text-sm font-semibold text-white/75 transition-colors hover:border-accent/40 hover:text-white"
                                        >
                                            {t('recruiter.dashboard.editProfile')}
                                            <Building2 size={15} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </motion.section>

                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                            <section className="space-y-6">
                                <motion.section
                                    variants={itemVariants}
                                    className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_55px_rgba(0,0,0,0.12)] md:p-6"
                                >
                                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-white">{t('recruiter.dashboard.recentApplications')}</h2>
                                            <p className="mt-1 text-sm text-white/55">{t('recruiter.dashboard.recentApplicationsHelp')}</p>
                                        </div>
                                        <Link
                                            to={candidaturesUrl}
                                            className="inline-flex w-fit items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 transition-colors hover:border-accent/40 hover:text-white"
                                        >
                                            {t('recruiter.dashboard.viewAll')}
                                            <ArrowRight size={14} />
                                        </Link>
                                    </div>

                                    {recentApplications.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-borderGlass bg-white/5 px-5 py-9 text-center">
                                            <p className="font-semibold text-white">{t('recruiter.dashboard.noApplications')}</p>
                                            <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
                                                {t('recruiter.dashboard.noApplicationsHelp')}
                                            </p>
                                            <Link
                                                to="/recruteur/offer/create"
                                                className="mt-4 inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
                                            >
                                                {t('recruiter.dashboard.createOffer')}
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {recentApplications.map((application) => {
                                                const candidate = getApplicationCandidate(application);
                                                const candidateProfile = getCandidateProfile(candidate);
                                                const offer = application.offer ?? {};

                                                return (
                                                    <article key={application.id} className="rounded-2xl border border-borderGlass bg-white/5 p-4 transition-colors hover:border-accent/35">
                                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-white">{candidate?.name || 'Candidat'}</p>
                                                                <p className="mt-1 text-sm text-white/55">{offer?.titre_poste || 'Offre'}</p>
                                                            </div>
                                                            <Link
                                                                to={`/recruteur/candidatures?offer=${offer?.id}`}
                                                                className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent/90"
                                                            >
                                                                {t('recruiter.dashboard.viewApplication')}
                                                            </Link>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/75">
                                                                <MapPin size={12} className="text-accent" />
                                                                {candidateProfile?.ville || offer?.ville || '-'}
                                                            </span>
                                                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                                                applicationStatusBadgeClasses[application.status] || 'border-white/20 bg-white/10 text-white/75'
                                                            }`}>
                                                                {toReadableApplicationStatus(application.status, t)}
                                                            </span>
                                                            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/75">
                                                                Quiz: {application.quiz_score ?? '-'}
                                                            </span>
                                                        </div>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.section>

                                <motion.section
                                    id="mes-offres"
                                    variants={itemVariants}
                                    className="scroll-mt-28 rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_55px_rgba(0,0,0,0.12)] md:p-6"
                                >
                                    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-white">{t('recruiter.dashboard.myOffers')}</h2>
                                            <p className="mt-1 text-sm text-white/55">{t('recruiter.dashboard.myOffersHelp')}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {offerFilters.map((filter) => (
                                                <button
                                                    key={filter.value}
                                                    type="button"
                                                    onClick={() => setOfferStatusFilter(filter.value)}
                                                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                                        offerStatusFilter === filter.value
                                                            ? 'border-accent bg-accent text-white'
                                                            : 'border-borderGlass bg-white/5 text-white/70 hover:border-accent/40 hover:text-white'
                                                    }`}
                                                >
                                                    {filter.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {offers.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-borderGlass bg-white/5 px-5 py-9 text-center">
                                            <p className="font-semibold text-white">{t('recruiter.dashboard.noOffers')}</p>
                                            <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
                                                {t('recruiter.dashboard.noOffersHelp')}
                                            </p>
                                            <Link
                                                to="/recruteur/offer/create"
                                                className="mt-4 inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
                                            >
                                                {t('recruiter.dashboard.createFirstOffer')}
                                            </Link>
                                        </div>
                                    ) : filteredOffers.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-borderGlass bg-white/5 px-5 py-9 text-center text-white/60">
                                            {t('recruiter.dashboard.noStatusOffers')}
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-left text-sm">
                                                <thead>
                                                    <tr className="border-b border-borderGlass text-xs uppercase tracking-wider text-white/45">
                                                        <th className="px-3 py-3 font-semibold">{t('candidate.dashboard.position')}</th>
                                                        <th className="px-3 py-3 font-semibold">{t('common.city')}</th>
                                                        <th className="px-3 py-3 font-semibold">{t('recruiter.dashboard.deadline')}</th>
                                                        <th className="px-3 py-3 font-semibold">{t('common.status')}</th>
                                                        <th className="px-3 py-3 font-semibold">{t('candidate.dashboard.applications')}</th>
                                                        <th className="px-3 py-3 font-semibold">{t('recruiter.dashboard.actions')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredOffers.map((offer) => (
                                                        <tr key={offer.id} className="border-b border-white/5 align-top text-white/76 last:border-b-0">
                                                            <td className="px-3 py-4">
                                                                <p className="font-semibold text-white">{offer.titre_poste}</p>
                                                                <p className="mt-1 text-xs text-white/45">{offer.type_contrat}</p>
                                                            </td>
                                                            <td className="px-3 py-4">{offer.ville}</td>
                                                            <td className="px-3 py-4">{formatDate(offer.expires_at)}</td>
                                                            <td className="px-3 py-4">
                                                                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                                                    offerStatusBadgeClasses[offer.status] || 'border-white/20 bg-white/10 text-white/75'
                                                                }`}>
                                                                    {toReadableOfferStatus(offer.status, t)}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-4 font-semibold text-white">{getApplicationsCount(offer)}</td>
                                                            <td className="px-3 py-4">
                                                                <div className="flex flex-wrap gap-2">
                                                                    <Link
                                                                        to={`/jobs/${offer.id}`}
                                                                        className="rounded-full border border-borderGlass bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/75 transition-colors hover:border-accent/40 hover:text-white"
                                                                    >
                                                                        {t('recruiter.dashboard.view')}
                                                                    </Link>
                                                                    <Link
                                                                        to={`/recruteur/candidatures?offer=${offer.id}`}
                                                                        className="rounded-full border border-borderGlass bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/75 transition-colors hover:border-accent/40 hover:text-white"
                                                                    >
                                                                        {t('candidate.dashboard.applications')}
                                                                    </Link>
                                                                    <Link
                                                                        to={`/recruteur/offer/edit/${offer.id}`}
                                                                        className="inline-flex items-center gap-1 rounded-full border border-borderGlass bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/75 transition-colors hover:border-accent/40 hover:text-white"
                                                                    >
                                                                        <Edit3 size={12} />
                                                                        {t('recruiter.dashboard.edit')}
                                                                    </Link>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </motion.section>
                            </section>

                            <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
                                <motion.section
                                    variants={itemVariants}
                                    className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_55px_rgba(0,0,0,0.12)]"
                                >
                                    <div className="mb-4 flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Resume</p>
                                            <h2 className="mt-1 text-xl font-bold text-white">Recrutement</h2>
                                        </div>
                                        <Briefcase size={20} className="text-white/45" />
                                    </div>
                                    <div className="space-y-2.5">
                                        <SummaryRow label={t('recruiter.dashboard.activeOffers')} value={activeOffers} tone="active" />
                                        <SummaryRow label={t('recruiter.dashboard.receivedApplications')} value={totalApplications} tone="applications" />
                                        <SummaryRow label={t('recruiter.dashboard.viewsToday')} value={viewsToday} tone="quota" />
                                    </div>
                                </motion.section>

                                <motion.section
                                    variants={itemVariants}
                                    className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_55px_rgba(0,0,0,0.12)]"
                                >
                                    <div className="mb-4 flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-accent">{t('recruiter.dashboard.quotaPremium')}</p>
                                            <h2 className="mt-1 text-xl font-bold text-white">
                                                {isPremium ? t('common.premiumActive') : t('recruiter.dashboard.quotaLabel', { used: quotaUsed, limit: dailyLimit })}
                                            </h2>
                                        </div>
                                        <Crown size={20} className={isPremium ? 'text-emerald-300' : 'text-accent'} />
                                    </div>

                                    {isPremium ? (
                                        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
                                            <p className="text-sm font-semibold text-emerald-200">Consultation illimitee active.</p>
                                            <p className="mt-1 text-xs text-white/60">
                                                {t('recruiter.dashboard.expiresOn', {
                                                    date: formatDate(subscription?.expires_at),
                                                    days: subscription?.days_remaining ?? 0,
                                                })}
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${quotaProgress}%` }} />
                                            </div>
                                            <p className="mt-3 text-sm text-white/62">
                                                {quotaRemaining > 0
                                                    ? 'Il vous reste une consultation gratuite de profil candidat.'
                                                    : 'Votre quota gratuit est epuise. Passez premium pour debloquer un usage illimite.'}
                                            </p>
                                            {quotaResetLabel && quotaRemaining === 0 && (
                                                <p className="mt-2 text-xs text-white/45">
                                                    Renouvellement estime: {quotaResetLabel}
                                                </p>
                                            )}
                                            <Link
                                                to="/recruteur/premium"
                                                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
                                            >
                                                {t('recruiter.dashboard.upgradePremium')}
                                                <ArrowUpRight size={15} />
                                            </Link>
                                        </div>
                                    )}
                                </motion.section>

                                <motion.section
                                    variants={itemVariants}
                                    className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_55px_rgba(0,0,0,0.12)]"
                                >
                                    <p className="flex items-center gap-2 text-sm font-semibold text-white">
                                        <Building2 size={16} className="text-accent" />
                                        Etablissement
                                    </p>
                                    <div className="mt-4 space-y-3 text-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-white/50">Nom</span>
                                            <span className="text-right font-semibold text-white">{establishmentName}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-white/50">Type</span>
                                            <span className="font-semibold text-white">{establishmentType}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-white/50">{t('common.city')}</span>
                                            <span className="font-semibold text-white">{establishmentCity}</span>
                                        </div>
                                    </div>
                                </motion.section>
                            </aside>
                        </div>
                    </motion.div>
                )}
            </main>
        </motion.div>
    );
}
