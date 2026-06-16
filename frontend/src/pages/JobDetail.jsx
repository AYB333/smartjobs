import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowLeft,
    BadgeCheck,
    Bookmark,
    BookmarkCheck,
    Briefcase,
    Building2,
    CalendarClock,
    CheckCircle2,
    Clock3,
    Coffee,
    FileText,
    Hotel,
    MapPin,
    Send,
    ShieldCheck,
    Sparkles,
    UtensilsCrossed,
    X,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../api/axios';
import { useToast } from '../context/useAppExperience';
import { calculateMatchScore, getMatchReasons, getMatchTone } from '../utils/matching';
import { extractSavedOfferIds } from '../utils/savedJobs';

function parseStoredUser() {
    try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function extractOffer(payload) {
    return payload?.data ?? payload ?? null;
}

function extractApplications(payload) {
    const source = payload?.data;
    if (Array.isArray(source?.data)) return source.data;
    if (Array.isArray(source)) return source;
    return [];
}

function formatSalary(value, t) {
    if (value === null || value === undefined || value === '') return t('common.salaryNotSpecified');
    const amount = Number(value);
    return Number.isFinite(amount) ? `${amount.toLocaleString('fr-FR')} MAD` : t('common.salaryNotSpecified');
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('fr-FR');
}

function getCountdownParts(expiresAt, t) {
    if (!expiresAt) return { expired: false, label: '-' };

    const target = new Date(expiresAt).getTime();
    if (Number.isNaN(target)) return { expired: false, label: '-' };

    const diff = target - Date.now();
    if (diff <= 0) return { expired: true, label: t('status.expired') };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    return { expired: false, label: `${days}j ${hours}h ${minutes}m` };
}

function getContractBadgeClass(contractType) {
    if (contractType === 'CDI') return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40';
    if (contractType === 'CDD') return 'bg-sky-500/15 text-sky-200 border-sky-400/40';
    if (contractType === 'Extra') return 'bg-orange-500/15 text-orange-200 border-orange-400/40';
    if (contractType === 'Saisonnier') return 'bg-violet-500/15 text-violet-200 border-violet-400/40';
    return 'bg-white/10 text-white/80 border-white/25';
}

function getStatusBadgeClass(status) {
    if (status === 'active') return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40';
    if (status === 'expired') return 'bg-rose-500/15 text-rose-200 border-rose-400/40';
    if (status === 'suspended') return 'bg-amber-500/15 text-amber-200 border-amber-400/40';
    return 'bg-white/10 text-white/80 border-white/25';
}

function normalizeStatus(status, t) {
    if (status === 'active') return t('status.active');
    if (status === 'expired') return t('status.expired');
    if (status === 'suspended') return t('status.suspended');
    return status ?? '-';
}

function toReadableApplicationStatus(status, t) {
    if (status === 'en_attente') return t('status.pending');
    if (status === 'acceptee') return t('jobDetail.accepted');
    if (status === 'refusee') return t('jobDetail.rejected');
    return status ?? '-';
}

const applicationStatusBadgeClasses = {
    en_attente: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
    acceptee: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
    refusee: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
};

const matchToneClasses = {
    strong: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
    good: 'border-sky-400/30 bg-sky-500/10 text-sky-200',
    low: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
};

const typeMeta = {
    cafe: {
        label: 'Cafe',
        Icon: Coffee,
        gradient: 'from-amber-500/35 via-orange-500/20 to-slate-950',
    },
    hotel: {
        label: 'Hotel',
        Icon: Hotel,
        gradient: 'from-sky-500/35 via-blue-500/20 to-slate-950',
    },
    restaurant: {
        label: 'Restaurant',
        Icon: UtensilsCrossed,
        gradient: 'from-rose-500/30 via-orange-500/20 to-slate-950',
    },
};

function normalizeType(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function getEstablishmentName(offer) {
    return (
        offer?.establishment_name
        || offer?.etablissement
        || offer?.recruteur?.recruteurProfile?.nom_etablissement
        || offer?.recruteur?.recruteur_profile?.nom_etablissement
        || 'Etablissement confidentiel'
    );
}

function getEstablishmentType(offer) {
    return (
        offer?.establishment_type
        || offer?.recruteur?.recruteurProfile?.type_etablissement
        || offer?.recruteur?.recruteur_profile?.type_etablissement
        || ''
    );
}

function getTypeMeta(offer) {
    const normalizedType = normalizeType(getEstablishmentType(offer));

    if (normalizedType.includes('cafe')) return typeMeta.cafe;
    if (normalizedType.includes('hotel')) return typeMeta.hotel;
    if (normalizedType.includes('restaurant')) return typeMeta.restaurant;

    return {
        label: 'CHR',
        Icon: Building2,
        gradient: 'from-accent/30 via-slate-700/25 to-slate-950',
    };
}

function EstablishmentVisual({ offer, className = '' }) {
    const meta = getTypeMeta(offer);
    const Icon = meta.Icon;

    return (
        <div className={`relative overflow-hidden rounded-3xl border border-borderGlass bg-white/5 ${className}`}>
            {offer?.image_url ? (
                <img
                    src={offer.image_url}
                    alt={offer?.titre_poste ? `Photo - ${offer.titre_poste}` : "Photo de l'offre"}
                    className="h-full w-full object-cover"
                />
            ) : (
                <div className={`flex h-full min-h-[220px] w-full items-center justify-center bg-gradient-to-br ${meta.gradient}`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.24),transparent_28%)]" />
                    <div className="relative flex flex-col items-center gap-3 text-white">
                        <span className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                            <Icon size={38} />
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-white/75">{meta.label}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoRow({ icon, label, value, tone = 'default' }) {
    const RowIcon = icon;
    const toneClass = {
        default: 'text-white',
        success: 'text-emerald-300',
        warning: 'text-amber-300',
        danger: 'text-rose-300',
    }[tone];

    return (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-borderGlass bg-white/5 px-4 py-3">
            <span className="inline-flex items-center gap-2 text-sm text-white/56">
                <RowIcon size={15} className="text-accent" />
                {label}
            </span>
            <span className={`text-right text-sm font-semibold ${toneClass}`}>{value}</span>
        </div>
    );
}

function getOfferFromApplication(application) {
    return application?.jobOffer ?? application?.job_offer ?? application?.offer ?? {};
}

function getOfferIdFromApplication(application) {
    return getOfferFromApplication(application)?.id ?? application?.job_offer_id ?? null;
}

function hasOfferQuiz(offer) {
    return Boolean(offer?.quiz || offer?.quiz_exists);
}

export default function JobDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast, t } = useToast();

    const [offer, setOffer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hasQuiz, setHasQuiz] = useState(false);
    const [applications, setApplications] = useState([]);
    const [applicationsLoading, setApplicationsLoading] = useState(false);
    const [savedOfferIds, setSavedOfferIds] = useState([]);
    const [savingOffer, setSavingOffer] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(() => parseStoredUser());
    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [countdownTick, setCountdownTick] = useState(0);

    const isAuthenticated = Boolean(localStorage.getItem('token'));

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdownTick((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return undefined;

        const timeoutId = window.setTimeout(async () => {
            try {
                const response = await api.get('/auth/me');
                if (response?.data?.user) {
                    setCurrentUser(response.data.user);
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                }
            } catch {
                // Keep the locally stored user if the refresh request fails.
            }
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [isAuthenticated]);

    useEffect(() => {
        const loadOffer = async () => {
            setLoading(true);
            setError('');

            try {
                const response = await api.get(`/offres/${id}`);
                const data = extractOffer(response?.data);
                setOffer(data);

                if (typeof data?.quiz !== 'undefined' || typeof data?.quiz_exists !== 'undefined') {
                    setHasQuiz(Boolean(data?.quiz || data?.quiz_exists));
                } else if (isAuthenticated && currentUser?.role === 'candidat') {
                    try {
                        await api.get(`/offres/${id}/pass-quiz`);
                        setHasQuiz(true);
                    } catch (quizError) {
                        if (quizError?.response?.status === 404) {
                            setHasQuiz(false);
                        }
                    }
                }
            } catch (requestError) {
                setError(
                    requestError?.response?.data?.message
                    || "Impossible de charger les details de l'offre."
                );
            } finally {
                setLoading(false);
            }
        };

        loadOffer();
    }, [id, isAuthenticated, currentUser?.role]);

    useEffect(() => {
        if (!isAuthenticated || currentUser?.role !== 'candidat') {
            return undefined;
        }

        const timeoutId = window.setTimeout(async () => {
            setApplicationsLoading(true);

            try {
                const [applicationsResponse, savedResponse] = await Promise.all([
                    api.get('/mes-postulations', { params: { limit: 100 } }),
                    api.get('/saved-offers').catch(() => null),
                ]);
                setApplications(extractApplications(applicationsResponse?.data));
                setSavedOfferIds(extractSavedOfferIds(savedResponse?.data));
            } catch {
                setApplications([]);
            } finally {
                setApplicationsLoading(false);
            }
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [currentUser?.role, isAuthenticated]);

    const countdown = getCountdownParts(offer?.expires_at, t);
    const etablissement = getEstablishmentName(offer);
    const establishmentType = getTypeMeta(offer).label;
    const isRecruteur = currentUser?.role === 'recruteur';
    const isCandidate = currentUser?.role === 'candidat';
    const currentProfile = currentUser?.candidatProfile ?? currentUser?.candidat_profile ?? currentUser?.profile ?? {};
    const matchScore = isCandidate ? calculateMatchScore(offer, currentProfile) : null;
    const matchTone = matchScore ? getMatchTone(matchScore) : null;
    const matchReasons = isCandidate ? getMatchReasons(offer, currentProfile) : [];
    const isSaved = savedOfferIds.includes(Number(id));
    const existingApplication = useMemo(() => (
        applications.find((application) => String(getOfferIdFromApplication(application)) === String(id)) ?? null
    ), [applications, id]);
    const applicationOffer = getOfferFromApplication(existingApplication);
    const applicationHasQuiz = hasQuiz || hasOfferQuiz(applicationOffer);
    const hasPendingQuiz = Boolean(existingApplication && applicationHasQuiz && existingApplication.quiz_score === null);
    const hasCompletedQuiz = Boolean(
        existingApplication
        && applicationHasQuiz
        && existingApplication.quiz_score !== null
        && existingApplication.quiz_score !== undefined
    );
    const hasCompleteProfile = Boolean(
        currentProfile?.ville
        && currentProfile?.experience
        && currentProfile?.poste_recherche
    );
    const hasCv = Boolean(currentProfile?.cv_path || currentProfile?.cv_url);
    const isReadyToApply = hasCompleteProfile && hasCv;
    const isOfferAvailable = Boolean(offer && offer.status === 'active' && !countdown.expired);
    const readinessMessage = t('jobDetail.profileWarning');
    const applicationAction = useMemo(() => {
        if (isRecruteur) {
            return { label: t('nav.recruiterSpace'), disabled: true, onClick: null };
        }

        if (!isAuthenticated) {
            if (offer && !isOfferAvailable) {
                return { label: t('common.unavailable'), disabled: true, onClick: null };
            }

            return {
                label: t('jobDetail.applyNow'),
                disabled: false,
                onClick: () => navigate('/auth', { replace: true }),
            };
        }

        if (!isCandidate) {
            return { label: t('jobDetail.candidateAccountRequired'), disabled: true, onClick: null };
        }

        if (existingApplication) {
            if (hasPendingQuiz) {
                return {
                    label: t('jobDetail.takeQuiz'),
                    disabled: false,
                    onClick: () => navigate(`/candidat/quiz/${id}`),
                };
            }

            if (existingApplication.status === 'acceptee') {
                return { label: t('jobDetail.accepted'), disabled: true, onClick: null };
            }

            if (existingApplication.status === 'refusee') {
                return { label: t('jobDetail.rejected'), disabled: true, onClick: null };
            }

            if (hasCompletedQuiz) {
                return { label: t('jobDetail.quizSent'), disabled: true, onClick: null };
            }

            return { label: t('jobDetail.pending'), disabled: true, onClick: null };
        }

        if (offer && !isOfferAvailable) {
            return { label: t('common.unavailable'), disabled: true, onClick: null };
        }

        if (!isReadyToApply) {
            return {
                label: t('jobDetail.completeProfile'),
                disabled: false,
                onClick: () => navigate('/candidat/profile'),
            };
        }

        return { label: t('jobDetail.applyNow'), disabled: false, onClick: null };
    }, [
        existingApplication,
        hasCompletedQuiz,
        hasPendingQuiz,
        id,
        isAuthenticated,
        isCandidate,
        isOfferAvailable,
        isReadyToApply,
        isRecruteur,
        navigate,
        offer,
        t,
    ]);

    const handleOpenPostuler = () => {
        if (!isOfferAvailable) {
            setSubmitError('Cette offre n est plus disponible.');
            return;
        }

        if (!isAuthenticated) {
            navigate('/auth', { replace: true });
            return;
        }

        if (currentUser?.role !== 'candidat') {
            setSubmitError('La postulation est reservee aux comptes candidats.');
            return;
        }

        if (existingApplication) {
            if (hasPendingQuiz) {
                navigate(`/candidat/quiz/${id}`);
            }
            return;
        }

        if (!isReadyToApply) {
            navigate('/candidat/profile');
            return;
        }

        setSubmitError('');
        setSuccessMessage('');
        setIsUploadOpen(true);
    };

    const handleSubmitPostulation = async (event) => {
        event.preventDefault();
        setSubmitError('');
        setSuccessMessage('');

        if (!isOfferAvailable) {
            setSubmitError('Cette offre n est plus disponible.');
            return;
        }

        if (!isReadyToApply) {
            setSubmitError(readinessMessage);
            return;
        }

        setSubmitLoading(true);

        try {
            const response = await api.post(`/offres/${id}/postuler`);
            const createdApplication = response?.data?.data;
            if (createdApplication) {
                setApplications((currentApplications) => [
                    { ...createdApplication, job_offer: offer },
                    ...currentApplications,
                ]);
            }

            const requiresQuiz = Boolean(response?.data?.has_quiz ?? hasQuiz);
            const message = requiresQuiz
                ? 'Postulation envoyee. Passez le quiz pour finaliser.'
                : 'Postulation envoyee avec succes.';
            setSuccessMessage(
                requiresQuiz
                    ? 'Postulation envoyee avec succes. Vous pouvez passer le quiz.'
                    : 'Postulation envoyee avec succes.'
            );
            showToast({
                type: 'success',
                title: 'Candidature',
                message,
            });
            setIsUploadOpen(false);
            setTimeout(() => {
                navigate(requiresQuiz ? `/candidat/quiz/${id}` : '/candidat/dashboard', { replace: true });
            }, 900);
        } catch (requestError) {
            if (requestError?.response?.status === 409 && requestError?.response?.data?.data) {
                const existing = requestError.response.data.data;
                setApplications((currentApplications) => {
                    const withoutExisting = currentApplications.filter((application) => application.id !== existing.id);
                    return [{ ...existing, job_offer: offer }, ...withoutExisting];
                });
                setIsUploadOpen(false);
            }

            const message =
                requestError?.response?.data?.message
                || "Impossible d'envoyer la postulation.";
            setSubmitError(message);
            showToast({
                type: 'error',
                title: 'Candidature',
                message,
            });
        } finally {
            setSubmitLoading(false);
        }
    };

    const toggleSavedOffer = async () => {
        if (!isAuthenticated || !isCandidate) {
            navigate('/auth?role=candidat&mode=login');
            return;
        }

        if (!isOfferAvailable && !isSaved) {
            showToast({
                type: 'error',
                title: 'Favoris',
                message: 'Cette offre ne peut pas etre sauvegardee.',
            });
            return;
        }

        setSavingOffer(true);

        try {
            if (isSaved) {
                await api.delete(`/offres/${id}/save`);
                setSavedOfferIds((current) => current.filter((offerId) => Number(offerId) !== Number(id)));
            } else {
                await api.post(`/offres/${id}/save`);
                setSavedOfferIds((current) => [...new Set([...current, Number(id)])]);
            }

            showToast({
                type: 'success',
                title: 'Favoris',
                message: isSaved ? 'Offre retiree des favoris.' : 'Offre sauvegardee.',
            });
        } catch (requestError) {
            showToast({
                type: 'error',
                title: 'Favoris',
                message: requestError?.response?.data?.message || "Impossible de mettre a jour l'offre sauvegardee.",
            });
        } finally {
            setSavingOffer(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-obsidian">
            <Navbar />

            {loading ? (
                <main className="container mx-auto px-6 pt-32 pb-16">
                    <div className="rounded-3xl border border-borderGlass bg-surface px-6 py-16 text-center">
                        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                        <p className="text-white/60">{t('common.loading')}</p>
                    </div>
                </main>
            ) : error ? (
                <main className="container mx-auto px-6 pt-32 pb-16">
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-200">
                        {error}
                    </div>
                </main>
            ) : (
                <>
                    <section className="force-dark relative w-full overflow-hidden border-b border-borderGlass pt-24 pb-8 lg:pt-28">
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_22%,rgba(232,101,26,0.20),transparent_34%),linear-gradient(135deg,#0A2540_18%,#0B0F19_72%)]" />
                        <div className="container relative z-10 mx-auto px-5 sm:px-6">
                            <Link
                                to="/jobs"
                                className="mb-5 inline-flex items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-4 py-2 text-sm font-semibold text-white/72 transition-colors hover:border-accent/45 hover:text-white"
                            >
                                <ArrowLeft size={15} />
                                {t('common.backToOffers')}
                            </Link>

                            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch">
                                <div className="flex flex-col justify-between rounded-3xl border border-borderGlass bg-surface/70 p-5 backdrop-blur-xl md:p-7">
                                    <div>
                                        <div className="mb-4 flex flex-wrap gap-2.5">
                                            <span className={`inline-flex rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider ${getContractBadgeClass(offer?.type_contrat)}`}>
                                                {offer?.type_contrat || 'Contrat'}
                                            </span>
                                            <span className={`inline-flex rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider ${getStatusBadgeClass(offer?.status)}`}>
                                                {normalizeStatus(offer?.status, t)}
                                            </span>
                                            <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/70">
                                                {establishmentType}
                                            </span>
                                            {hasQuiz && (
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
                                                    <ShieldCheck size={12} />
                                                    {t('jobDetail.quizRequired')}
                                                </span>
                                            )}
                                        </div>

                                        <h1 className="max-w-4xl text-3xl font-black leading-tight text-white md:text-5xl">
                                            {offer?.titre_poste}
                                        </h1>
                                        <p className="mt-4 text-base font-semibold text-accent md:text-lg">
                                            {etablissement}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2 text-sm text-white/64">
                                            <span className="inline-flex items-center gap-1.5">
                                                <MapPin size={15} className="text-accent" />
                                                {offer?.ville || t('recruiter.dashboard.cityMissing')}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <Briefcase size={15} className="text-accent" />
                                                {formatSalary(offer?.salaire, t)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                            <p className="text-xs uppercase tracking-wider text-white/42">{t('jobDetail.deadline')}</p>
                                            <p className="mt-1 font-semibold text-white">{formatDate(offer?.expires_at)}</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                            <p className="text-xs uppercase tracking-wider text-white/42">{t('jobDetail.remainingTime')}</p>
                                            <p key={countdownTick} className={`mt-1 font-semibold ${countdown.expired ? 'text-rose-300' : 'text-emerald-300'}`}>
                                                {countdown.label}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                            <p className="text-xs uppercase tracking-wider text-white/42">Quiz</p>
                                            <p className="mt-1 font-semibold text-white">{hasQuiz ? t('jobDetail.quizRequired') : t('jobDetail.notRequired')}</p>
                                        </div>
                                    </div>
                                </div>

                                <EstablishmentVisual offer={offer} className="min-h-[240px] lg:min-h-[360px]" />
                            </div>
                        </div>
                    </section>

                    <main className="container mx-auto min-h-[720px] px-5 py-8 pb-16 sm:px-6 lg:py-10">
                        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
                            <section className="space-y-6">
                                <div className="rounded-3xl border border-borderGlass bg-surface p-6 shadow-[0_18px_55px_rgba(0,0,0,0.10)] md:p-7">
                                    <h2 className="text-xl font-bold text-white">{t('jobDetail.description')}</h2>
                                    <p className="mt-4 whitespace-pre-line text-sm leading-7 text-white/68 md:text-base">
                                        {offer?.description || '-'}
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-borderGlass bg-surface p-6 shadow-[0_18px_55px_rgba(0,0,0,0.10)] md:p-7">
                                    <h2 className="text-xl font-bold text-white">{t('jobDetail.mainInfo')}</h2>
                                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                                        <InfoRow icon={MapPin} label={t('common.city')} value={offer?.ville || '-'} />
                                        <InfoRow icon={Briefcase} label={t('common.salary')} value={formatSalary(offer?.salaire, t)} />
                                        <InfoRow icon={BadgeCheck} label={t('common.contract')} value={offer?.type_contrat || '-'} />
                                        <InfoRow icon={CalendarClock} label={t('jobDetail.deadline')} value={formatDate(offer?.expires_at)} />
                                        <InfoRow
                                            icon={Clock3}
                                            label={t('jobDetail.remainingTime')}
                                            value={countdown.label}
                                            tone={countdown.expired ? 'danger' : 'success'}
                                        />
                                        <InfoRow
                                            icon={ShieldCheck}
                                            label="Quiz"
                                            value={hasQuiz ? t('jobDetail.quizRequired') : t('jobDetail.notRequired')}
                                            tone={hasQuiz ? 'warning' : 'default'}
                                        />
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-borderGlass bg-surface p-6 shadow-[0_18px_55px_rgba(0,0,0,0.10)] md:p-7">
                                    <h2 className="text-xl font-bold text-white">{t('jobDetail.establishment')}</h2>
                                    <div className="mt-5 grid gap-5 md:grid-cols-[180px_minmax(0,1fr)] md:items-stretch">
                                        <EstablishmentVisual offer={offer} className="min-h-[160px]" />
                                        <div className="grid gap-3">
                                            <InfoRow icon={Building2} label={t('recruiter.profile.establishmentName')} value={etablissement} />
                                            <InfoRow icon={UtensilsCrossed} label="Type" value={establishmentType} />
                                            <InfoRow icon={MapPin} label={t('common.city')} value={offer?.ville || '-'} />
                                        </div>
                                    </div>
                                </div>

                                {hasQuiz && (
                                    <div className="rounded-3xl border border-accent/25 bg-accent/10 p-6 shadow-[0_18px_55px_rgba(232,101,26,0.08)] md:p-7">
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-accent/15 text-accent">
                                                <ShieldCheck size={22} />
                                            </span>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">{t('jobDetail.quizRequired')}</h2>
                                                <p className="mt-2 text-sm leading-6 text-white/65">
                                                    Cette offre demande un quiz metier apres la postulation. Vous postulez d'abord, puis le quiz met a jour la meme candidature.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>

                            <aside className="lg:sticky lg:top-28 lg:self-start">
                                <div className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_55px_rgba(0,0,0,0.14)] md:p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-accent">{t('jobDetail.application')}</p>
                                            <h3 className="mt-1 text-xl font-bold text-white">{t('jobDetail.applyToOffer')}</h3>
                                        </div>
                                        <span className="rounded-2xl border border-borderGlass bg-white/5 p-3 text-accent">
                                            <Send size={18} />
                                        </span>
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-white/60">
                                        {t('jobDetail.cvAuto')}
                                    </p>

                                    {isCandidate && (
                                        <div className="mt-5 space-y-2.5">
                                            {matchScore && (
                                                <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-semibold ${matchToneClasses[matchTone]}`}>
                                                    <Sparkles size={14} />
                                                    Match profil {matchScore}%
                                                </div>
                                            )}
                                            {matchReasons.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {matchReasons.map((reason) => (
                                                        <span key={reason} className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                                                            {reason}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-semibold ${
                                                hasCompleteProfile
                                                    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                                                    : 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                                            }`}>
                                                {hasCompleteProfile ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                                                {t('jobDetail.profileComplete')}
                                            </div>
                                            <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-semibold ${
                                                hasCv
                                                    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                                                    : 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                                            }`}>
                                                {hasCv ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                                                {t('jobDetail.cvAdded')}
                                            </div>
                                        </div>
                                    )}

                                    {isCandidate && !existingApplication && !isReadyToApply && (
                                        <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
                                            <p className="text-sm font-semibold text-amber-100">{readinessMessage}</p>
                                            <p className="mt-1 text-xs leading-5 text-amber-100/70">
                                                {t('jobDetail.profileWarningHelp')}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => navigate('/candidat/profile')}
                                                className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent/90"
                                            >
                                                <FileText size={13} />
                                                {t('jobDetail.goProfile')}
                                            </button>
                                        </div>
                                    )}

                                    {isCandidate && existingApplication && (
                                        <div className="mt-4 rounded-2xl border border-borderGlass bg-white/5 p-4">
                                            <div className="flex flex-col gap-3">
                                                <div>
                                                    <p className="font-semibold text-white">{t('jobDetail.alreadyApplied')}</p>
                                                    <p className="mt-1 text-xs text-white/55">
                                                        {t('jobDetail.followDashboard')}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                                                        applicationStatusBadgeClasses[existingApplication.status] || 'border-white/20 bg-white/10 text-white/75'
                                                    }`}
                                                >
                                                    {toReadableApplicationStatus(existingApplication.status, t)}
                                                </span>
                                            </div>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70">
                                                    <ShieldCheck size={13} className="text-accent" />
                                                    {t('common.quiz')}: {existingApplication.quiz_score ?? (applicationHasQuiz ? t('jobDetail.pending') : t('jobDetail.notRequired'))}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => navigate('/candidat/dashboard')}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-borderGlass bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/75 transition-colors hover:border-accent/40 hover:text-white"
                                                >
                                                    {t('common.dashboard')}
                                                </button>
                                                {hasPendingQuiz && (
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/candidat/quiz/${id}`)}
                                                        className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent/90"
                                                    >
                                                        {t('jobDetail.takeQuiz')}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={applicationAction.onClick || handleOpenPostuler}
                                        disabled={applicationAction.disabled || applicationsLoading}
                                        title={!isCandidate && isAuthenticated ? 'La postulation est reservee aux candidats' : undefined}
                                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/45"
                                    >
                                        {hasPendingQuiz ? <ShieldCheck size={16} /> : <Send size={16} />}
                                        {applicationsLoading && isCandidate ? t('common.loading') : applicationAction.label}
                                    </button>

                                    {isCandidate && (isOfferAvailable || isSaved) && (
                                        <button
                                            type="button"
                                            onClick={toggleSavedOffer}
                                            disabled={savingOffer}
                                            className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
                                                isSaved
                                                    ? 'border-accent bg-accent text-white hover:bg-accent/90'
                                                    : 'border-accent/35 bg-accent/10 text-accent hover:bg-accent hover:text-white'
                                            }`}
                                        >
                                            {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                                            {savingOffer ? t('jobDetail.updating') : isSaved ? t('jobDetail.savedOffer') : t('jobDetail.saveOffer')}
                                        </button>
                                    )}

                                    <div className="mt-4 rounded-2xl border border-borderGlass bg-white/5 p-3 text-xs text-white/60">
                                        <p className="inline-flex items-center gap-1.5">
                                            <Sparkles size={13} className="text-accent" />
                                            CV centralise depuis votre profil candidat
                                        </p>
                                        <p className="mt-1 inline-flex items-center gap-1.5">
                                            <BadgeCheck size={13} className="text-accent" />
                                            Reponse visible dans votre dashboard candidat
                                        </p>
                                    </div>

                                    {submitError && <p className="mt-3 text-sm text-rose-300">{submitError}</p>}
                                    {successMessage && <p className="mt-3 text-sm text-emerald-300">{successMessage}</p>}
                                </div>
                            </aside>
                        </div>
                    </main>
                </>
            )}

            <Footer />

            <AnimatePresence>
                {isUploadOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 22, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 12, scale: 0.96 }}
                            className="w-full max-w-lg rounded-3xl border border-borderGlass bg-obsidian p-6"
                        >
                            <div className="mb-5 flex items-start justify-between">
                                <div>
                                    <h3 className="text-xl font-semibold text-white">{t('jobDetail.confirmApplication')}</h3>
                                    <p className="mt-1 text-sm text-white/60">
                                        {t('jobDetail.confirmHelp')}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsUploadOpen(false)}
                                    className="rounded-full border border-borderGlass bg-white/5 p-2 text-white/70 transition-colors hover:border-accent/50 hover:text-white"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitPostulation} className="space-y-4">
                                <div className="rounded-2xl border border-borderGlass bg-surface p-4">
                                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                                        <FileText size={16} className="text-accent" />
                                        {t('jobDetail.profileCvReady')}
                                    </p>
                                    <p className="mt-1 text-xs text-white/55">
                                        {t('jobDetail.changeCvHelp')}
                                    </p>
                                </div>

                                {submitError && <p className="text-sm text-rose-300">{submitError}</p>}

                                <button
                                    type="submit"
                                    disabled={submitLoading}
                                    className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-70"
                                >
                                    {submitLoading ? t('jobDetail.sending') : t('jobDetail.confirmSubmit')}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
