import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    Bell,
    BookmarkCheck,
    Building2,
    CheckCircle2,
    Coffee,
    FileText,
    Hotel,
    MapPin,
    ShieldCheck,
    UtensilsCrossed,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { extractSavedOffers } from '../utils/savedJobs';

const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0 },
};

const statusBadgeClasses = {
    en_attente: 'bg-amber-500/12 text-amber-300 border-amber-400/30',
    acceptee: 'bg-emerald-500/12 text-emerald-300 border-emerald-400/30',
    refusee: 'bg-rose-500/12 text-rose-300 border-rose-400/30',
};

const establishmentTypeMeta = {
    cafe: {
        label: 'Café',
        Icon: Coffee,
        gradient: 'from-amber-500/35 via-orange-500/20 to-slate-950',
    },
    hotel: {
        label: 'Hôtel',
        Icon: Hotel,
        gradient: 'from-sky-500/35 via-blue-500/20 to-slate-950',
    },
    restaurant: {
        label: 'Restaurant',
        Icon: UtensilsCrossed,
        gradient: 'from-rose-500/30 via-orange-500/20 to-slate-950',
    },
};

function extractApplications(payload) {
    const paginated = payload?.data;

    if (Array.isArray(paginated?.data)) {
        return paginated.data;
    }

    if (Array.isArray(paginated)) {
        return paginated;
    }

    return [];
}

function extractOffers(payload) {
    const source = payload?.data;

    if (Array.isArray(source?.data)) {
        return source.data;
    }

    if (Array.isArray(source)) {
        return source;
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

function getInitials(name) {
    const initials = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    return initials || 'C';
}

function normalize(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function toTimestamp(value, fallback = 0) {
    if (!value) return fallback;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? fallback : time;
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

function formatSalary(salary) {
    if (salary === null || salary === undefined || salary === '') {
        return 'Salaire non précisé';
    }

    const amount = Number(salary);
    return Number.isFinite(amount) ? `${amount.toLocaleString('fr-FR')} MAD` : 'Salaire non précisé';
}

function toReadableStatus(status) {
    if (status === 'en_attente') return 'En attente';
    if (status === 'acceptee') return 'Acceptée';
    if (status === 'refusee') return 'Refusée';
    return status ?? '-';
}

function getCandidateProfile(user) {
    const profile = user?.candidatProfile
        ?? user?.candidat_profile
        ?? user?.profile
        ?? {};

    return {
        ...profile,
        cv_path: profile?.cv_path ?? profile?.cvPath ?? '',
        cv_url: profile?.cv_url ?? profile?.cvUrl ?? '',
        photo_path: profile?.photo_path ?? profile?.photoPath ?? '',
        photo_url: profile?.photo_url ?? profile?.photoUrl ?? '',
    };
}

function getOfferFromApplication(application) {
    return application?.jobOffer ?? application?.job_offer ?? {};
}

function getOfferIdFromApplication(application) {
    return getOfferFromApplication(application)?.id ?? application?.job_offer_id ?? null;
}

function hasOfferQuiz(offer) {
    return Boolean(offer?.quiz || offer?.quiz_exists);
}

function getEstablishmentType(offer) {
    return (
        offer?.establishment_type
        || offer?.recruteur?.recruteurProfile?.type_etablissement
        || offer?.recruteur?.recruteur_profile?.type_etablissement
        || ''
    );
}

function getEstablishmentTypeMeta(offer) {
    const type = normalize(getEstablishmentType(offer));

    if (type.includes('cafe')) return establishmentTypeMeta.cafe;
    if (type.includes('hotel')) return establishmentTypeMeta.hotel;
    if (type.includes('restaurant')) return establishmentTypeMeta.restaurant;

    return {
        label: 'CHR',
        Icon: Building2,
        gradient: 'from-accent/30 via-slate-700/25 to-slate-950',
    };
}

function getEstablishmentName(offer) {
    return (
        offer?.establishment_name
        || offer?.etablissement
        || offer?.recruteur?.recruteurProfile?.nom_etablissement
        || offer?.recruteur?.recruteur_profile?.nom_etablissement
        || 'Établissement confidentiel'
    );
}

function isActiveOffer(offer) {
    if (!offer || offer.status === 'expired' || offer.status === 'suspended') {
        return false;
    }

    if (!offer.expires_at) {
        return offer.status === 'active' || !offer.status;
    }

    return toTimestamp(offer.expires_at) >= Date.now();
}

function getCompletionState(user) {
    const profile = getCandidateProfile(user);
    const items = [
        { key: 'ville', label: 'Ville', value: profile?.ville },
        { key: 'experience', label: 'Expérience', value: profile?.experience },
        { key: 'poste_recherche', label: 'Poste recherché', value: profile?.poste_recherche },
        { key: 'cv_path', label: 'CV', value: profile?.cv_path || profile?.cv_url },
    ];
    const completed = items.filter((item) => item.value !== null && item.value !== undefined && String(item.value).trim() !== '').length;
    const missing = items.filter((item) => !item.value || String(item.value).trim() === '');

    return {
        profile,
        items,
        missing,
        percent: Math.round((completed / items.length) * 100),
        hasCoreProfile: Boolean(profile?.ville && profile?.experience && profile?.poste_recherche),
        hasCv: Boolean(profile?.cv_path || profile?.cv_url),
        isComplete: missing.length === 0,
    };
}

function scoreOfferForProfile(offer, profile) {
    let score = 0;
    const offerCity = normalize(offer?.ville);
    const profileCity = normalize(profile?.ville);
    const offerTitle = normalize(offer?.titre_poste);
    const wantedPosition = normalize(profile?.poste_recherche);

    if (offerCity && profileCity && offerCity === profileCity) {
        score += 45;
    }

    if (offerTitle && wantedPosition) {
        const titleWords = offerTitle.split(/\s+/).filter((word) => word.length > 2);
        const wantedWords = wantedPosition.split(/\s+/).filter((word) => word.length > 2);
        const sharedWord = titleWords.some((word) => wantedWords.includes(word));

        if (sharedWord || offerTitle.includes(wantedPosition) || wantedPosition.includes(offerTitle)) {
            score += 45;
        }
    }

    if (hasOfferQuiz(offer)) {
        score += 3;
    }

    return score;
}

function uniqueOffers(offers) {
    const seen = new Set();
    return offers.filter((offer) => {
        if (!offer?.id || seen.has(offer.id)) {
            return false;
        }

        seen.add(offer.id);
        return true;
    });
}

async function fetchRecommendationPool(profile) {
    const requests = [
        api.get('/offres', { params: { limit: 12 } }),
    ];

    if (profile?.ville) {
        requests.push(api.get('/offres', { params: { ville: profile.ville, limit: 12 } }));
    }

    if (profile?.poste_recherche) {
        requests.push(api.get('/offres', { params: { search: profile.poste_recherche, limit: 12 } }));
    }

    const responses = await Promise.allSettled(requests);
    return uniqueOffers(
        responses.flatMap((response) => (
            response.status === 'fulfilled'
                ? extractOffers(response.value?.data)
                : []
        ))
    );
}

function RecommendedJobCard({ offer }) {
    const hasQuiz = hasOfferQuiz(offer);
    const typeMeta = getEstablishmentTypeMeta(offer);
    const PlaceholderIcon = typeMeta.Icon;

    return (
        <article className="group overflow-hidden rounded-2xl border border-borderGlass bg-white/5 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[0_16px_42px_rgba(232,101,26,0.10)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl border border-borderGlass bg-white/5 sm:w-28">
                    {offer?.image_url ? (
                        <img
                            src={offer.image_url}
                            alt={offer?.titre_poste ? `Photo - ${offer.titre_poste}` : "Photo de l'offre"}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            loading="lazy"
                        />
                    ) : (
                        <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${typeMeta.gradient}`}>
                            <span className="rounded-xl border border-white/15 bg-white/10 p-3 text-white/85 backdrop-blur-md">
                                <PlaceholderIcon size={22} />
                            </span>
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white/60">{getEstablishmentName(offer)}</p>
                    <h3 className="mt-1 text-base font-bold leading-snug text-white">{offer?.titre_poste || 'Offre'}</h3>
                </div>
                <Link
                    to={`/jobs/${offer?.id}`}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent/90"
                >
                    Voir l’offre
                    <ArrowRight size={13} />
                </Link>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/75">
                    <MapPin size={12} className="text-accent" />
                    {offer?.ville || '-'}
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/75">
                    {offer?.type_contrat || '-'}
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/75">
                    {formatSalary(offer?.salaire)}
                </span>
                {hasQuiz && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                        <ShieldCheck size={12} />
                        Quiz
                    </span>
                )}
            </div>
        </article>
    );
}

function SummaryRow({ label, value, tone = 'default' }) {
    const toneClass = {
        default: 'bg-white/35',
        pending: 'bg-amber-300',
        accepted: 'bg-emerald-300',
        rejected: 'bg-rose-300',
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

function ApplicationTimeline({ application, offer }) {
    const hasQuiz = hasOfferQuiz(offer);
    const quizDone = !hasQuiz || application.quiz_score !== null;
    const answered = application.status === 'acceptee' || application.status === 'refusee';
    const steps = [
        { label: 'Postulee', done: true },
        { label: hasQuiz ? 'Quiz' : 'Profil envoye', done: quizDone },
        { label: 'Reponse', done: answered },
    ];

    return (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {steps.map((step) => (
                <span
                    key={step.label}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        step.done
                            ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                            : 'border-white/10 bg-white/5 text-white/45'
                    }`}
                >
                    <span className={`h-1.5 w-1.5 rounded-full ${step.done ? 'bg-emerald-300' : 'bg-white/25'}`} />
                    {step.label}
                </span>
            ))}
        </div>
    );
}

function getCandidateNotifications(applications, completion) {
    const notifications = [];
    const pendingQuiz = applications.find((application) => {
        const offer = getOfferFromApplication(application);
        return application.quiz_score === null && hasOfferQuiz(offer) && getOfferIdFromApplication(application);
    });
    const accepted = applications.find((application) => application.status === 'acceptee');
    const rejected = applications.find((application) => application.status === 'refusee');

    if (!completion.isComplete) {
        notifications.push({
            label: 'Profil incomplet',
            description: `${completion.missing[0]?.label || 'Information'} manque pour ameliorer vos recommandations.`,
        });
    }

    if (pendingQuiz) {
        notifications.push({
            label: 'Quiz en attente',
            description: getOfferFromApplication(pendingQuiz)?.titre_poste || 'Une candidature attend votre quiz.',
        });
    }

    if (accepted) {
        notifications.push({
            label: 'Candidature acceptee',
            description: getOfferFromApplication(accepted)?.titre_poste || 'Un recruteur a accepte votre candidature.',
        });
    }

    if (rejected) {
        notifications.push({
            label: 'Statut mis a jour',
            description: getOfferFromApplication(rejected)?.titre_poste || 'Une candidature a recu une reponse.',
        });
    }

    return notifications.slice(0, 4);
}

export default function CandidatDashboard() {
    const [applications, setApplications] = useState([]);
    const [offerPool, setOfferPool] = useState([]);
    const [savedOffers, setSavedOffers] = useState([]);
    const [currentUser, setCurrentUser] = useState(() => parseStoredUser());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const [applicationsResponse, meResponse, savedResponse] = await Promise.all([
                api.get('/mes-postulations'),
                api.get('/auth/me').catch(() => null),
                api.get('/saved-offers').catch(() => null),
            ]);

            const loadedApplications = extractApplications(applicationsResponse?.data);
            const user = meResponse?.data?.user ?? parseStoredUser();
            const profile = getCandidateProfile(user);
            const recommendedPool = await fetchRecommendationPool(profile);
            const loadedSavedOffers = extractSavedOffers(savedResponse?.data).filter((offer) => isActiveOffer(offer));

            setApplications(loadedApplications);
            setOfferPool(recommendedPool);
            setSavedOffers(loadedSavedOffers);

            if (user) {
                setCurrentUser(user);
                localStorage.setItem('user', JSON.stringify(user));
            }
        } catch (requestError) {
            setError(
                requestError?.response?.data?.message
                || 'Impossible de charger le dashboard candidat.'
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

    const completion = useMemo(() => getCompletionState(currentUser), [currentUser]);
    const firstName = currentUser?.name?.split(' ')?.[0] || currentUser?.name || 'candidat';
    const avatarInitials = getInitials(currentUser?.name);
    const candidatePhotoUrl = buildStorageUrl(
        getBackendBaseUrl(),
        completion.profile?.photo_url || completion.profile?.photo_path
    );
    const missingText = completion.isComplete
        ? 'Profil complet'
        : `${completion.missing[0]?.label || 'Information'} manquant`;
    const profileCtaLabel = completion.isComplete ? 'Modifier mon profil' : 'Compléter mon profil';

    const stats = useMemo(() => {
        const sent = applications.length;
        const pending = applications.filter((item) => item.status === 'en_attente').length;
        const accepted = applications.filter((item) => item.status === 'acceptee').length;
        const rejected = applications.filter((item) => item.status === 'refusee').length;

        return { sent, pending, accepted, rejected };
    }, [applications]);
    const notifications = useMemo(() => getCandidateNotifications(applications, completion), [applications, completion]);
    const savedOffersPreview = useMemo(() => savedOffers.slice(0, 3), [savedOffers]);

    const pendingQuizApplication = useMemo(() => applications.find((application) => {
        const offer = getOfferFromApplication(application);
        return application.quiz_score === null && hasOfferQuiz(offer) && Boolean(getOfferIdFromApplication(application));
    }), [applications]);
    const pendingQuizOffer = getOfferFromApplication(pendingQuizApplication);
    const pendingQuizOfferId = getOfferIdFromApplication(pendingQuizApplication);

    const nextAction = useMemo(() => {
        if (!completion.hasCoreProfile) {
            return {
                title: 'Complétez vos informations',
                description: 'Ajoutez votre ville, expérience et poste recherché pour recevoir de meilleures offres.',
                label: 'Compléter mon profil',
                to: '/candidat/profile',
            };
        }

        if (!completion.hasCv) {
            return {
                title: 'Ajoutez votre CV',
                description: 'Votre CV sera réutilisé automatiquement à chaque postulation.',
                label: 'Ajouter mon CV',
                to: '/candidat/profile',
            };
        }

        if (pendingQuizOfferId) {
            return {
                title: 'Passez le quiz en attente',
                description: pendingQuizOffer?.titre_poste
                    ? `Quiz requis pour ${pendingQuizOffer.titre_poste}.`
                    : 'Une candidature attend votre quiz.',
                label: 'Passer le quiz',
                to: `/candidat/quiz/${pendingQuizOfferId}`,
            };
        }

        return {
            title: 'Explorez les nouvelles offres',
            description: 'Votre profil est prêt. Continuez à postuler aux offres actives.',
            label: 'Voir les offres',
            to: '/jobs',
        };
    }, [completion.hasCoreProfile, completion.hasCv, pendingQuizOffer, pendingQuizOfferId]);

    const appliedOfferIds = useMemo(() => new Set(
        applications
            .map((application) => getOfferIdFromApplication(application))
            .filter(Boolean)
    ), [applications]);

    const recommendedOffers = useMemo(() => {
        if (!completion.hasCoreProfile) {
            return [];
        }

        return offerPool
            .filter((offer) => isActiveOffer(offer))
            .filter((offer) => !appliedOfferIds.has(offer.id))
            .sort((first, second) => {
                const firstScore = scoreOfferForProfile(first, completion.profile);
                const secondScore = scoreOfferForProfile(second, completion.profile);

                if (firstScore !== secondScore) {
                    return secondScore - firstScore;
                }

                return toTimestamp(second?.created_at, Number(second?.id || 0)) - toTimestamp(first?.created_at, Number(first?.id || 0));
            })
            .slice(0, 6);
    }, [appliedOfferIds, completion.hasCoreProfile, completion.profile, offerPool]);

    const recentApplications = useMemo(() => [...applications]
        .sort((first, second) => toTimestamp(second?.created_at) - toTimestamp(first?.created_at))
        .slice(0, 6), [applications]);

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
                        <p className="text-white/60">Chargement du dashboard...</p>
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
                            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-borderGlass bg-white/5 shadow-[0_14px_34px_rgba(0,0,0,0.14)] md:h-[72px] md:w-[72px]">
                                        {candidatePhotoUrl ? (
                                            <img
                                                src={candidatePhotoUrl}
                                                alt={currentUser?.name ? `Photo de ${currentUser.name}` : 'Photo candidat'}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="flex h-full w-full items-center justify-center border border-accent/25 bg-accent/12 text-xl font-black text-accent">
                                                {avatarInitials}
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent">Accueil candidat</p>
                                    <h1 className="text-3xl font-black leading-tight text-white md:text-4xl">Bonjour, {firstName}</h1>
                                    <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/62">
                                        {completion.isComplete
                                            ? 'Voici les offres et candidatures les plus importantes pour vous.'
                                            : 'Complétez votre profil pour recevoir de meilleures offres.'}
                                    </p>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-borderGlass bg-white/5 p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-white/45">Profil</p>
                                            <p className="mt-1 text-sm font-semibold text-white">{missingText}</p>
                                        </div>
                                        <span className="text-2xl font-black text-white">{completion.percent}%</span>
                                    </div>
                                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                                        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${completion.percent}%` }} />
                                    </div>
                                    <div className="mt-4 flex flex-col gap-2 sm:flex-row lg:flex-col">
                                        <Link
                                            to="/candidat/profile"
                                            className="inline-flex items-center justify-center rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
                                        >
                                            {profileCtaLabel}
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
                                            <h2 className="text-xl font-bold text-white">Offres recommandées pour vous</h2>
                                            <p className="mt-1 text-sm text-white/55">
                                                Basées sur votre ville, votre poste recherché et les offres actives.
                                            </p>
                                        </div>
                                        <Link
                                            to="/jobs"
                                            className="inline-flex w-fit items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 transition-colors hover:border-accent/40 hover:text-white"
                                        >
                                            Voir toutes
                                            <ArrowRight size={14} />
                                        </Link>
                                    </div>

                                    {!completion.hasCoreProfile ? (
                                        <div className="rounded-2xl border border-dashed border-borderGlass bg-white/5 px-5 py-9 text-center">
                                            <p className="font-semibold text-white">Complétez votre profil pour recevoir des recommandations adaptées.</p>
                                            <Link
                                                to="/candidat/profile"
                                                className="mt-4 inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
                                            >
                                                Compléter mon profil
                                            </Link>
                                        </div>
                                    ) : recommendedOffers.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-borderGlass bg-white/5 px-5 py-9 text-center">
                                            <p className="font-semibold text-white">Aucune recommandation disponible pour le moment.</p>
                                            <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
                                                Explorez toutes les offres ou modifiez votre ville et le poste recherché.
                                            </p>
                                            <Link
                                                to="/jobs"
                                                className="mt-4 inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
                                            >
                                                Voir les offres
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {recommendedOffers.map((offer) => (
                                                <RecommendedJobCard key={offer.id} offer={offer} />
                                            ))}
                                        </div>
                                    )}
                                </motion.section>

                                <motion.section
                                    variants={itemVariants}
                                    className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_55px_rgba(0,0,0,0.12)] md:p-6"
                                >
                                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-white">Offres sauvegardees</h2>
                                            <p className="mt-1 text-sm text-white/55">Vos favoris pour revenir rapidement aux opportunites interessantes.</p>
                                        </div>
                                        <Link
                                            to="/jobs"
                                            className="inline-flex w-fit items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 transition-colors hover:border-accent/40 hover:text-white"
                                        >
                                            Explorer
                                            <ArrowRight size={14} />
                                        </Link>
                                    </div>

                                    {savedOffersPreview.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-borderGlass bg-white/5 px-5 py-8 text-center">
                                            <BookmarkCheck size={22} className="mx-auto mb-3 text-accent" />
                                            <p className="font-semibold text-white">Aucune offre sauvegardee.</p>
                                            <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
                                                Sauvegardez les offres qui vous interessent depuis la liste des offres.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {savedOffersPreview.map((offer) => (
                                                <RecommendedJobCard key={offer.id} offer={offer} />
                                            ))}
                                        </div>
                                    )}
                                </motion.section>

                                <motion.section
                                    variants={itemVariants}
                                    className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_55px_rgba(0,0,0,0.12)] md:p-6"
                                >
                                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-white">Mes candidatures récentes</h2>
                                            <p className="mt-1 text-sm text-white/55">Statut, quiz et accès rapide aux offres déjà envoyées.</p>
                                        </div>
                                        <Link
                                            to="/jobs"
                                            className="inline-flex w-fit items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 transition-colors hover:border-accent/40 hover:text-white"
                                        >
                                            Trouver une offre
                                            <ArrowRight size={14} />
                                        </Link>
                                    </div>

                                    {recentApplications.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-borderGlass bg-white/5 px-5 py-9 text-center">
                                            <p className="font-semibold text-white">Vous n’avez pas encore postulé.</p>
                                            <Link
                                                to="/jobs"
                                                className="mt-4 inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
                                            >
                                                Voir les offres
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-left text-sm">
                                                <thead>
                                                    <tr className="border-b border-borderGlass text-xs uppercase tracking-wider text-white/45">
                                                        <th className="px-3 py-3 font-semibold">Offre</th>
                                                        <th className="px-3 py-3 font-semibold">Ville</th>
                                                        <th className="px-3 py-3 font-semibold">Statut</th>
                                                        <th className="px-3 py-3 font-semibold">Score quiz</th>
                                                        <th className="px-3 py-3 font-semibold">Date</th>
                                                        <th className="px-3 py-3 font-semibold">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {recentApplications.map((application) => {
                                                        const offer = getOfferFromApplication(application);
                                                        const offerId = getOfferIdFromApplication(application);
                                                        const shouldPassQuiz = application.quiz_score === null && hasOfferQuiz(offer) && offerId;

                                                        return (
                                                            <tr key={application.id} className="border-b border-white/5 align-top text-white/76 last:border-b-0">
                                                                <td className="px-3 py-4">
                                                                    <p className="font-semibold text-white">{offer?.titre_poste || 'Offre'}</p>
                                                                    <p className="mt-1 text-xs text-white/45">{getEstablishmentName(offer)}</p>
                                                                    <ApplicationTimeline application={application} offer={offer} />
                                                                </td>
                                                                <td className="px-3 py-4">{offer?.ville || '-'}</td>
                                                                <td className="px-3 py-4">
                                                                    <span
                                                                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                                                            statusBadgeClasses[application.status] || 'bg-white/10 text-white/80 border-white/25'
                                                                        }`}
                                                                    >
                                                                        {toReadableStatus(application.status)}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-4 font-semibold text-white">
                                                                    {application.quiz_score ?? '-'}
                                                                </td>
                                                                <td className="px-3 py-4 text-white/65">{formatDate(application.created_at)}</td>
                                                                <td className="px-3 py-4">
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {shouldPassQuiz && (
                                                                            <Link
                                                                                to={`/candidat/quiz/${offerId}`}
                                                                                className="inline-flex items-center gap-1.5 rounded-full border border-accent/35 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
                                                                            >
                                                                                <ShieldCheck size={13} />
                                                                                Quiz
                                                                            </Link>
                                                                        )}
                                                                        {offerId && (
                                                                            <Link
                                                                                to={`/jobs/${offerId}`}
                                                                                className="inline-flex items-center rounded-full border border-borderGlass bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/75 transition-colors hover:border-accent/40 hover:text-white"
                                                                            >
                                                                                Voir offre
                                                                            </Link>
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
                                </motion.section>
                            </section>

                            <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
                                <motion.section
                                    variants={itemVariants}
                                    className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_55px_rgba(0,0,0,0.12)]"
                                >
                                    <div className="mb-4 flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Notifications</p>
                                            <h2 className="mt-1 text-xl font-bold text-white">A suivre</h2>
                                        </div>
                                        <Bell size={20} className="text-white/45" />
                                    </div>

                                    {notifications.length === 0 ? (
                                        <p className="rounded-2xl border border-borderGlass bg-white/5 px-4 py-3 text-sm text-white/58">
                                            Aucune alerte importante pour le moment.
                                        </p>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {notifications.map((notification) => (
                                                <div key={`${notification.label}-${notification.description}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                                    <p className="text-sm font-semibold text-white">{notification.label}</p>
                                                    <p className="mt-1 text-xs text-white/55">{notification.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.section>

                                <motion.section
                                    variants={itemVariants}
                                    className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_55px_rgba(0,0,0,0.12)]"
                                >
                                    <p className="text-xs font-semibold uppercase tracking-wider text-accent">Prochaine action</p>
                                    <h2 className="mt-2 text-xl font-bold text-white">{nextAction.title}</h2>
                                    <p className="mt-2 text-sm leading-relaxed text-white/62">{nextAction.description}</p>
                                    <Link
                                        to={nextAction.to}
                                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
                                    >
                                        {nextAction.label}
                                        <ArrowRight size={15} />
                                    </Link>
                                </motion.section>

                                <motion.section
                                    variants={itemVariants}
                                    className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_55px_rgba(0,0,0,0.12)]"
                                >
                                    <div className="mb-4 flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Résumé</p>
                                            <h2 className="mt-1 text-xl font-bold text-white">Candidatures</h2>
                                        </div>
                                        <FileText size={20} className="text-white/45" />
                                    </div>

                                    <div className="space-y-2.5">
                                        <SummaryRow label="Candidatures envoyées" value={stats.sent} />
                                        <SummaryRow label="En attente" value={stats.pending} tone="pending" />
                                        <SummaryRow label="Acceptées" value={stats.accepted} tone="accepted" />
                                        <SummaryRow label="Refusées" value={stats.rejected} tone="rejected" />
                                    </div>
                                </motion.section>

                                <motion.section
                                    variants={itemVariants}
                                    className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_55px_rgba(0,0,0,0.12)]"
                                >
                                    <p className="flex items-center gap-2 text-sm font-semibold text-white">
                                        <CheckCircle2 size={16} className="text-accent" />
                                        Profil utilisé pour postuler
                                    </p>
                                    <div className="mt-4 space-y-3 text-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-white/50">Ville</span>
                                            <span className="font-semibold text-white">{completion.profile?.ville || '-'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-white/50">Poste</span>
                                            <span className="text-right font-semibold text-white">{completion.profile?.poste_recherche || '-'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-white/50">CV</span>
                                            <span className={completion.hasCv ? 'font-semibold text-emerald-300' : 'font-semibold text-amber-300'}>
                                                {completion.hasCv ? 'Ajouté' : 'Manquant'}
                                            </span>
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
