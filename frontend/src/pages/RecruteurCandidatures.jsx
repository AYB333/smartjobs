import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import {
    ArrowRight,
    Briefcase,
    Calendar,
    Check,
    Download,
    FileText,
    MapPin,
    MessageCircle,
    RotateCcw,
    Search,
    ShieldCheck,
    Sparkles,
    UserRound,
    X,
} from 'lucide-react';
import ApplicationChat from '../components/ApplicationChat';
import Navbar from '../components/Navbar';
import SmartSelect from '../components/SmartSelect';
import api from '../api/axios';
import { useToast } from '../context/useAppExperience';

const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0 },
};

const statusBadgeClasses = {
    en_attente: 'bg-amber-500/12 text-amber-300 border-amber-400/30',
    acceptee: 'bg-emerald-500/12 text-emerald-300 border-emerald-400/30',
    refusee: 'bg-rose-500/12 text-rose-300 border-rose-400/30',
};

function extractPaginatedList(payload) {
    const source = payload?.data;
    if (Array.isArray(source?.data)) return source.data;
    if (Array.isArray(source)) return source;
    return [];
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

function formatDate(dateString) {
    if (!dateString) return '-';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('fr-FR');
}

function toTimestamp(dateString) {
    if (!dateString) return 0;
    const time = new Date(dateString).getTime();
    return Number.isNaN(time) ? 0 : time;
}

function toReadableStatus(status, t) {
    if (status === 'en_attente') return t('status.pending');
    if (status === 'acceptee') return t('status.accepted');
    if (status === 'refusee') return t('status.rejected');
    return status ?? '-';
}

function normalize(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function getCandidateReviewScore(application) {
    const candidate = getApplicationCandidate(application);
    const profile = getCandidateProfile(candidate);
    const offer = getOfferFromApplication(application);
    let score = 35;

    if (application.quiz_score !== null && application.quiz_score !== undefined) {
        const quizScore = Number(application.quiz_score);
        if (Number.isFinite(quizScore)) {
            score += Math.round(quizScore * 0.45);
        }
    }

    if (normalize(profile?.ville) && normalize(profile?.ville) === normalize(offer?.ville)) {
        score += 15;
    }

    const target = normalize(profile?.poste_recherche);
    const title = normalize(offer?.titre_poste);
    if (target && title && (title.includes(target) || target.includes(title))) {
        score += 15;
    }

    if (profile?.experience) {
        score += 5;
    }

    return Math.max(35, Math.min(score, 98));
}

function getInitials(value) {
    const initials = String(value || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    return initials || 'C';
}

function getApplicationCandidate(application) {
    return application?.candidat ?? application?.candidate ?? {};
}

function getCandidateProfile(candidate) {
    return candidate?.candidatProfile
        ?? candidate?.candidat_profile
        ?? candidate?.profile
        ?? {};
}

function getOfferApplications(offer) {
    return Array.isArray(offer?.applications) ? offer.applications : [];
}

function getApplicationsCount(offer) {
    if (typeof offer?.applications_count === 'number') {
        return offer.applications_count;
    }

    return getOfferApplications(offer).length;
}

function getOfferFromApplication(application) {
    return application?.offer ?? application?.jobOffer ?? application?.job_offer ?? {};
}

function getOfferIdFromApplication(application) {
    return application?._offerId
        ?? application?.job_offer_id
        ?? application?.jobOffer?.id
        ?? application?.job_offer?.id
        ?? application?.offer?.id
        ?? '';
}

function resolveCvUrl(application, profile, backendBase) {
    const directUrl = application?.cv_url ?? profile?.cv_url ?? '';
    if (directUrl) return buildStorageUrl(backendBase, directUrl);

    const cvPath = application?.cv_path ?? profile?.cv_path ?? '';
    return buildStorageUrl(backendBase, cvPath);
}

function resolvePhotoUrl(profile, backendBase) {
    return buildStorageUrl(backendBase, profile?.photo_url ?? profile?.photo_path);
}

function SummaryPill({ label, value, tone = 'default' }) {
    const toneClass = {
        default: 'bg-white/35',
        pending: 'bg-amber-300',
        accepted: 'bg-emerald-300',
        rejected: 'bg-rose-300',
    }[tone];

    return (
        <div className="rounded-2xl border border-borderGlass bg-surface px-4 py-3 shadow-[0_14px_36px_rgba(0,0,0,0.10)]">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                <span className={`h-2 w-2 rounded-full ${toneClass}`} />
                {label}
            </p>
            <p className="mt-2 text-2xl font-black text-white">{value}</p>
        </div>
    );
}

export default function RecruteurCandidatures() {
    const { showToast, t } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [offers, setOffers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [quizFilter, setQuizFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [chatApplication, setChatApplication] = useState(null);
    const [error, setError] = useState('');

    const backendBase = useMemo(() => getBackendBaseUrl(), []);
    const selectedOfferId = searchParams.get('offer') || 'all';

    const loadData = useCallback(async () => {
        setError('');
        setLoading(true);

        try {
            const offersResponse = await api.get('/mes-offres');
            setOffers(extractPaginatedList(offersResponse?.data));
        } catch (requestError) {
            setError(requestError?.response?.data?.message || t('recruiter.applications.loading'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadData();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [loadData]);

    const allApplications = useMemo(() => (
        offers
            .flatMap((offer) => getOfferApplications(offer).map((application) => ({
                ...application,
                _offerId: offer.id,
                offer,
            })))
            .sort((first, second) => toTimestamp(second?.created_at) - toTimestamp(first?.created_at))
    ), [offers]);

    const summary = useMemo(() => ({
        total: allApplications.length,
        pending: allApplications.filter((application) => application.status === 'en_attente').length,
        accepted: allApplications.filter((application) => application.status === 'acceptee').length,
        rejected: allApplications.filter((application) => application.status === 'refusee').length,
    }), [allApplications]);

    const filteredApplications = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return allApplications.filter((application) => {
            const candidate = getApplicationCandidate(application);
            const offer = getOfferFromApplication(application);
            const profile = getCandidateProfile(candidate);
            const haystack = [
                candidate?.name,
                candidate?.email,
                offer?.titre_poste,
                offer?.ville,
                profile?.ville,
            ].filter(Boolean).join(' ').toLowerCase();

            const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
            const matchesOffer = selectedOfferId === 'all' || String(getOfferIdFromApplication(application)) === String(selectedOfferId);
            const matchesStatus = statusFilter === 'all' || application.status === statusFilter;
            const hasQuizScore = application.quiz_score !== null && application.quiz_score !== undefined;
            const matchesQuiz = quizFilter === 'all'
                || (quizFilter === 'with_score' && hasQuizScore)
                || (quizFilter === 'without_score' && !hasQuizScore);

            return matchesSearch && matchesOffer && matchesStatus && matchesQuiz;
        }).sort((first, second) => getCandidateReviewScore(second) - getCandidateReviewScore(first));
    }, [allApplications, quizFilter, searchTerm, selectedOfferId, statusFilter]);

    const updateOfferFilter = (value) => {
        const nextParams = new URLSearchParams(searchParams);
        if (value === 'all') {
            nextParams.delete('offer');
        } else {
            nextParams.set('offer', String(value));
        }
        setSearchParams(nextParams, { replace: true });
    };

    const resetFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setQuizFilter('all');
        updateOfferFilter('all');
    };

    const updateStatus = async (applicationId, status) => {
        setUpdatingId(applicationId);
        setError('');

        try {
            await api.patch(`/postulations/${applicationId}/status`, { status });

            setOffers((currentOffers) => currentOffers.map((offer) => ({
                ...offer,
                applications: getOfferApplications(offer).map((application) => (
                    application.id === applicationId ? { ...application, status } : application
                )),
            })));

            showToast({
                type: 'success',
                title: t('candidate.dashboard.applications'),
                message: status === 'acceptee' ? t('recruiter.applications.accept') : t('recruiter.applications.reject'),
            });
        } catch (requestError) {
            const message = requestError?.response?.data?.message || 'Echec de la mise a jour du statut.';
            setError(message);
            showToast({
                type: 'error',
                title: 'Candidature',
                message,
            });
        } finally {
            setUpdatingId(null);
        }
    };

    const hasAnyFilter = Boolean(searchTerm.trim())
        || selectedOfferId !== 'all'
        || statusFilter !== 'all'
        || quizFilter !== 'all';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-obsidian"
        >
            <Navbar />

            <main className="container mx-auto px-5 pt-28 pb-14 sm:px-6 lg:pt-32">
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
                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_560px] lg:items-end">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">{t('recruiter.dashboard.kicker')}</p>
                                <h1 className="mt-3 text-3xl font-black text-white md:text-5xl">{t('recruiter.applications.title')}</h1>
                                <p className="mt-3 max-w-2xl text-base text-white/60 md:text-lg">
                                    {t('recruiter.applications.subtitle')}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <SummaryPill label="Total" value={summary.total} />
                                <SummaryPill label={t('status.pending')} value={summary.pending} tone="pending" />
                                <SummaryPill label={t('status.accepted')} value={summary.accepted} tone="accepted" />
                                <SummaryPill label={t('status.rejected')} value={summary.rejected} tone="rejected" />
                            </div>
                        </div>
                    </motion.section>

                    {error && (
                        <motion.section
                            variants={itemVariants}
                            className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm font-medium text-rose-200"
                        >
                            {error}
                        </motion.section>
                    )}

                    <motion.section
                        variants={itemVariants}
                        className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_55px_rgba(0,0,0,0.10)] md:p-6"
                    >
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white">{t('recruiter.applications.filtersTitle')}</h2>
                                <p className="mt-1 text-sm text-white/55">
                                    {t('recruiter.applications.filtersHelp')}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={resetFilters}
                                className="inline-flex w-fit items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 transition-colors hover:border-accent/40 hover:text-white"
                            >
                                <RotateCcw size={14} />
                                {t('common.reset')}
                            </button>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.2fr)_minmax(180px,0.9fr)_170px_180px]">
                            <label className="group rounded-2xl border border-borderGlass bg-obsidian/55 px-4 py-3 transition-colors focus-within:border-accent/50">
                                <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/45">
                                    <Search size={14} className="text-accent" />
                                    Recherche
                                </span>
                                <input
                                    type="search"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder={t('recruiter.applications.searchPlaceholder')}
                                    className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/35"
                                />
                            </label>

                            <SmartSelect
                                label={t('common.offer')}
                                icon={Briefcase}
                                value={selectedOfferId}
                                onChange={updateOfferFilter}
                                options={[
                                    { value: 'all', label: t('recruiter.applications.allOffers') },
                                    ...offers.map((offer) => ({
                                        value: offer.id,
                                        label: `${offer.titre_poste} - ${offer.ville} (${getApplicationsCount(offer)})`,
                                    })),
                                ]}
                                buttonClassName="bg-obsidian/55"
                            />

                            <SmartSelect
                                label={t('common.status')}
                                value={statusFilter}
                                onChange={setStatusFilter}
                                options={[
                                    { value: 'all', label: t('common.all') },
                                    { value: 'en_attente', label: t('candidate.dashboard.pending') },
                                    { value: 'acceptee', label: t('candidate.dashboard.accepted') },
                                    { value: 'refusee', label: t('candidate.dashboard.rejected') },
                                ]}
                                buttonClassName="bg-obsidian/55"
                            />

                            <SmartSelect
                                label="Quiz"
                                icon={ShieldCheck}
                                value={quizFilter}
                                onChange={setQuizFilter}
                                options={[
                                    { value: 'all', label: t('common.all') },
                                    { value: 'with_score', label: t('recruiter.applications.withScore') },
                                    { value: 'without_score', label: t('recruiter.applications.withoutScore') },
                                ]}
                                buttonClassName="bg-obsidian/55"
                            />
                        </div>
                    </motion.section>

                    <motion.section
                        variants={itemVariants}
                        className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_55px_rgba(0,0,0,0.12)] md:p-6"
                    >
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white">{t('recruiter.applications.listTitle')}</h2>
                                <p className="mt-1 text-sm text-white/55">
                                    {t('recruiter.applications.displayed', { count: filteredApplications.length })}
                                </p>
                            </div>

                            <Link
                                to="/recruteur/offer/create"
                                className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
                            >
                                {t('recruiter.profile.createOffer')}
                                <ArrowRight size={14} />
                            </Link>
                        </div>

                        {loading ? (
                            <div className="py-16 text-center">
                                <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                                <p className="text-white/60">{t('recruiter.applications.loading')}</p>
                            </div>
                        ) : allApplications.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-borderGlass bg-white/5 px-5 py-12 text-center">
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-borderGlass bg-white/5 text-accent">
                                    <UserRound size={22} />
                                </div>
                                <p className="text-lg font-bold text-white">{t('recruiter.applications.empty')}</p>
                                <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
                                    {t('recruiter.applications.emptyHelp')}
                                </p>
                                <Link
                                    to="/recruteur/offer/create"
                                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
                                >
                                    {t('recruiter.profile.createOffer')}
                                    <ArrowRight size={14} />
                                </Link>
                            </div>
                        ) : filteredApplications.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-borderGlass bg-white/5 px-5 py-12 text-center">
                                <p className="text-lg font-bold text-white">{t('recruiter.applications.noMatch')}</p>
                                <p className="mt-2 text-sm text-white/55">{t('recruiter.applications.noMatchHelp')}</p>
                                {hasAnyFilter && (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-borderGlass bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/75 transition-colors hover:border-accent/40 hover:text-white"
                                    >
                                        <RotateCcw size={14} />
                                        {t('common.reset')}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {filteredApplications.map((application) => {
                                    const candidate = getApplicationCandidate(application);
                                    const profile = getCandidateProfile(candidate);
                                    const offer = getOfferFromApplication(application);
                                    const offerId = getOfferIdFromApplication(application);
                                    const cvUrl = resolveCvUrl(application, profile, backendBase);
                                    const photoUrl = resolvePhotoUrl(profile, backendBase);
                                    const isUpdating = updatingId === application.id;
                                    const isAccepted = application.status === 'acceptee';
                                    const isRejected = application.status === 'refusee';
                                    const reviewScore = getCandidateReviewScore(application);

                                    return (
                                        <article
                                            key={application.id}
                                            className="rounded-3xl border border-borderGlass bg-white/5 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[0_18px_48px_rgba(232,101,26,0.10)] md:p-5"
                                        >
                                            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_270px] xl:items-center">
                                                <div className="min-w-0">
                                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-borderGlass bg-accent/15 text-sm font-black text-accent">
                                                            {photoUrl ? (
                                                                <img src={photoUrl} alt={`Photo de ${candidate?.name || 'candidat'}`} className="h-full w-full object-cover" />
                                                            ) : (
                                                                getInitials(candidate?.name)
                                                            )}
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-lg font-bold text-white">{candidate?.name || 'Candidat'}</p>
                                                                    <p className="mt-1 truncate text-sm text-white/50">{candidate?.email || 'Email non renseigné'}</p>
                                                                </div>

                                                                <span
                                                                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                                                                        statusBadgeClasses[application.status] || 'border-white/20 bg-white/10 text-white/75'
                                                                    }`}
                                                                >
                                                                    {toReadableStatus(application.status, t)}
                                                                </span>
                                                                <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                                                                    reviewScore >= 75
                                                                        ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                                                                        : 'border-sky-400/30 bg-sky-500/10 text-sky-200'
                                                                }`}>
                                                                    <Sparkles size={12} />
                                                                        {reviewScore >= 75 ? t('recruiter.applications.recommendedProfile') : t('recruiter.applications.profileScore')} {reviewScore}%
                                                                </span>
                                                            </div>

                                                            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                                                                <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75">
                                                                    <Briefcase size={13} className="shrink-0 text-accent" />
                                                                    <span className="truncate">{offer?.titre_poste || 'Offre'}</span>
                                                                </span>
                                                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75">
                                                                    <MapPin size={13} className="shrink-0 text-accent" />
                                                                    <span className="truncate">{profile?.ville || offer?.ville || '-'}</span>
                                                                </span>
                                                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75">
                                                                    <ShieldCheck size={13} className="shrink-0 text-accent" />
                                                                    <span>{t('common.quiz')}: {application.quiz_score ?? t('recruiter.applications.noScore')}</span>
                                                                </span>
                                                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75">
                                                                    <Calendar size={13} className="shrink-0 text-accent" />
                                                                    <span>{formatDate(application.created_at)}</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
                                                    {cvUrl ? (
                                                        <a
                                                            href={cvUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-borderGlass bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/85 transition-colors hover:border-accent/45 hover:text-white"
                                                        >
                                                            <Download size={15} />
                                                            {t('recruiter.applications.cvAction')}
                                                        </a>
                                                    ) : (
                                                        <span className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/38">
                                                            <FileText size={15} />
                                                            {t('recruiter.applications.cvUnavailable')}
                                                        </span>
                                                    )}

                                                    <div className="grid flex-1 grid-cols-2 gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={isUpdating || isAccepted}
                                                            onClick={() => updateStatus(application.id, 'acceptee')}
                                                            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-45"
                                                        >
                                                            <Check size={14} />
                                                            {t('recruiter.applications.accept')}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={isUpdating || isRejected}
                                                            onClick={() => updateStatus(application.id, 'refusee')}
                                                            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-2.5 text-xs font-bold text-rose-200 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-45"
                                                        >
                                                            <X size={14} />
                                                            {t('recruiter.applications.reject')}
                                                        </button>
                                                    </div>

                                                    {isAccepted && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setChatApplication(application)}
                                                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20"
                                                        >
                                                            <MessageCircle size={15} />
                                                            {t('candidate.dashboard.discussion')}
                                                        </button>
                                                    )}

                                                    {offerId && (
                                                        <Link
                                                            to={`/jobs/${offerId}`}
                                                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-borderGlass bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:border-accent/40 hover:text-white"
                                                        >
                                                            {t('common.viewOffer')}
                                                            <ArrowRight size={14} />
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </motion.section>
                </motion.div>
            </main>

            {chatApplication && (
                <ApplicationChat
                    application={chatApplication}
                    onClose={() => setChatApplication(null)}
                />
            )}
        </motion.div>
    );
}
