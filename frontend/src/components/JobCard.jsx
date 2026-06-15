import { motion } from 'framer-motion';
import {
    Briefcase,
    Building2,
    Bookmark,
    BookmarkCheck,
    Clock3,
    Coffee,
    DollarSign,
    Hotel,
    MapPin,
    ShieldCheck,
    Sparkles,
    UtensilsCrossed,
    Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../context/useAppExperience';
import { calculateMatchScore, getMatchTone } from '../utils/matching';

const itemVariants = {
    hidden: { y: 28, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 110, damping: 16 } },
};

const contractStyles = {
    CDI: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
    CDD: 'bg-sky-500/15 text-sky-200 border-sky-400/30',
    Extra: 'bg-orange-500/15 text-orange-200 border-orange-400/30',
    Saisonnier: 'bg-violet-500/15 text-violet-200 border-violet-400/30',
};

const matchStyles = {
    strong: 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200',
    good: 'border-sky-400/35 bg-sky-500/15 text-sky-200',
    low: 'border-amber-400/35 bg-amber-500/15 text-amber-200',
};

const typeMeta = {
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

function normalizeType(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function getEstablishmentName(job) {
    return (
        job?.establishment_name
        || job?.etablissement
        || job?.recruteur?.recruteurProfile?.nom_etablissement
        || job?.recruteur?.recruteur_profile?.nom_etablissement
        || 'Etablissement confidentiel'
    );
}

function getEstablishmentType(job) {
    return (
        job?.establishment_type
        || job?.recruteur?.recruteurProfile?.type_etablissement
        || job?.recruteur?.recruteur_profile?.type_etablissement
        || ''
    );
}

function getTypeMeta(job) {
    const normalizedType = normalizeType(getEstablishmentType(job));

    if (normalizedType.includes('cafe')) return typeMeta.cafe;
    if (normalizedType.includes('hotel')) return typeMeta.hotel;
    if (normalizedType.includes('restaurant')) return typeMeta.restaurant;

    return {
        label: 'CHR',
        Icon: Building2,
        gradient: 'from-accent/30 via-slate-700/25 to-slate-950',
    };
}

function getCountdown(expiresAt) {
    if (!expiresAt) return 'Date non disponible';
    const targetTime = new Date(expiresAt).getTime();
    if (Number.isNaN(targetTime)) return 'Date non disponible';

    const diff = targetTime - Date.now();
    if (diff <= 0) return 'Expiree';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `${days}j ${hours}h restantes`;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('fr-FR');
}

function isUrgent(expiresAt) {
    if (!expiresAt) return false;
    const targetTime = new Date(expiresAt).getTime();
    if (Number.isNaN(targetTime)) return false;
    const diff = targetTime - Date.now();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
}

function formatSalary(salaire) {
    if (salaire === null || salaire === undefined || salaire === '') {
        return 'Non specifie';
    }

    const amount = Number(salaire);
    return Number.isFinite(amount) ? `${amount.toLocaleString('fr-FR')} MAD` : 'Non specifie';
}

function EstablishmentVisual({ job, compact = false }) {
    const meta = getTypeMeta(job);
    const Icon = meta.Icon;

    return (
        <div className={`relative overflow-hidden rounded-2xl border border-borderGlass bg-white/5 ${compact ? 'aspect-[16/9]' : 'h-full min-h-[148px]'}`}>
            {job?.image_url ? (
                <img
                    src={job.image_url}
                    alt={job?.titre_poste ? `Photo - ${job.titre_poste}` : "Photo de l'offre"}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                />
            ) : (
                <div className={`flex h-full min-h-[148px] w-full items-center justify-center bg-gradient-to-br ${meta.gradient}`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.22),transparent_28%)]" />
                    <div className="relative flex flex-col items-center gap-2 text-white">
                        <span className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                            <Icon size={30} />
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-white/75">{meta.label}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function SaveButton({ isSaved, saving, onToggle }) {
    if (!onToggle) {
        return null;
    }

    const Icon = isSaved ? BookmarkCheck : Bookmark;

    return (
        <button
            type="button"
            disabled={saving}
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onToggle();
            }}
            className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
                isSaved
                    ? 'border-accent/40 bg-accent/15 text-accent hover:bg-accent hover:text-white'
                    : 'border-borderGlass bg-white/5 text-white/72 hover:border-accent/45 hover:text-white'
            }`}
            title={isSaved ? 'Retirer des favoris' : 'Sauvegarder cette offre'}
        >
            <Icon size={14} />
            {isSaved ? 'Sauvegardee' : 'Sauver'}
        </button>
    );
}

export default function JobCard({ job, variant = 'grid', isSaved = false, saving = false, onToggleSaved }) {
    const { t } = useI18n();
    const urgent = isUrgent(job?.expires_at);
    const contractClass = contractStyles[job?.type_contrat] || 'bg-white/10 text-white/75 border-white/20';
    const countdown = getCountdown(job?.expires_at);
    const expiresDate = formatDate(job?.expires_at);
    const postedDate = formatDate(job?.created_at);
    const hasQuiz = Boolean(job?.quiz_exists || job?.quiz);
    const applicationsCount = Number(job?.applications_count ?? 0);
    const matchScore = calculateMatchScore(job);
    const matchTone = matchScore ? getMatchTone(matchScore) : null;
    const establishmentName = getEstablishmentName(job);
    const establishmentType = getTypeMeta(job).label;

    if (variant === 'list') {
        return (
            <motion.article
                variants={itemVariants}
                className="job-card group relative overflow-hidden rounded-3xl border border-borderGlass bg-surface p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_18px_55px_rgba(232,101,26,0.14)]"
            >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/0 to-accent/0 transition-all duration-500 group-hover:from-accent/5 group-hover:to-transparent" />

                <div className="relative z-10 grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)_190px] lg:items-stretch">
                    <EstablishmentVisual job={job} />

                    <div className="min-w-0 py-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/65">
                                {establishmentType}
                            </span>
                            {matchScore && (
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${matchStyles[matchTone]}`}>
                                    <Sparkles size={12} />
                                    {t('matching.label')} {matchScore}%
                                </span>
                            )}
                            {urgent && (
                                <span className="inline-flex animate-pulse rounded-full border border-rose-400/40 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-200">
                                    Urgent
                                </span>
                            )}
                        </div>

                        <p className="job-card-company mb-1 truncate text-sm font-semibold text-white/62">{establishmentName}</p>
                        <h3 className="job-card-title break-words text-2xl font-black leading-tight text-white">{job?.titre_poste || 'Offre'}</h3>

                        <div className="mt-4 flex flex-wrap gap-2.5">
                            <span className="job-card-badge inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80">
                                <MapPin size={13} className="text-accent" />
                                {job?.ville || '-'}
                            </span>

                            <span className={`job-card-badge inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${contractClass}`}>
                                <Briefcase size={13} />
                                {job?.type_contrat || '-'}
                            </span>

                            <span className="job-card-badge inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80">
                                <DollarSign size={13} className="text-accent" />
                                {formatSalary(job?.salaire)}
                            </span>

                            {hasQuiz && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/35 bg-accent/10 px-3 py-1.5 text-xs text-accent">
                                    <ShieldCheck size={13} />
                                    Quiz
                                </span>
                            )}

                            {applicationsCount > 0 && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200">
                                    <Users size={13} />
                                    {applicationsCount} candidat{applicationsCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-borderGlass bg-white/5 p-4 lg:items-end lg:text-right">
                        <div className="text-xs text-white/55">
                            <p className="inline-flex items-center gap-1.5 lg:justify-end">
                                <Clock3 size={13} className="text-accent" />
                                Publie le {postedDate}
                            </p>
                            <p className="mt-2 text-white/45">Fin le {expiresDate}</p>
                            <p className="mt-1 font-semibold text-white/70">{countdown}</p>
                        </div>

                        <Link
                            to={`/jobs/${job?.id}`}
                            className="inline-flex justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-accent/90"
                        >
                            Voir l'offre
                        </Link>
                        <SaveButton isSaved={isSaved} saving={saving} onToggle={onToggleSaved} />
                    </div>
                </div>
            </motion.article>
        );
    }

    return (
        <motion.article
            variants={itemVariants}
            className="job-card group relative flex h-full flex-col overflow-hidden rounded-3xl border border-borderGlass bg-surface p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_18px_55px_rgba(232,101,26,0.14)]"
        >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/0 to-accent/0 transition-all duration-500 group-hover:from-accent/5 group-hover:to-transparent" />

            <div className="relative z-10 flex h-full flex-col">
                {job?.image_url && (
                    <div className="mb-5">
                        <EstablishmentVisual job={job} compact />
                    </div>
                )}

                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h3 className="job-card-title break-words text-xl font-bold leading-snug text-white">{job?.titre_poste || 'Offre'}</h3>
                        <p className="job-card-company mt-1 text-sm font-medium text-white/60">{establishmentName}</p>
                    </div>

                    <div className="flex shrink-0 flex-row flex-wrap gap-2 sm:flex-col sm:items-end">
                        {matchScore && (
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${matchStyles[matchTone]}`}>
                                <Sparkles size={12} />
                                {t('matching.label')} {matchScore}%
                            </span>
                        )}

                        {urgent && (
                            <span className="inline-flex animate-pulse rounded-full border border-rose-400/40 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-200">
                                Urgent
                            </span>
                        )}
                    </div>
                </div>

                <div className="mb-6 flex flex-wrap gap-2.5">
                    <span className="job-card-badge inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80">
                        <MapPin size={13} className="text-accent" />
                        {job?.ville || '-'}
                    </span>

                    <span className={`job-card-badge inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${contractClass}`}>
                        <Briefcase size={13} />
                        {job?.type_contrat || '-'}
                    </span>

                    <span className="job-card-badge inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80">
                        <DollarSign size={13} className="text-accent" />
                        {formatSalary(job?.salaire)}
                    </span>

                    {hasQuiz && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/35 bg-accent/10 px-3 py-1.5 text-xs text-accent">
                            <ShieldCheck size={13} />
                            Quiz
                        </span>
                    )}

                    {applicationsCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200">
                            <Users size={13} />
                            {applicationsCount} candidat{applicationsCount > 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                <div className="job-card-footer mt-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-white/45">
                        <p className="inline-flex items-center gap-1.5">
                            <Clock3 size={13} className="text-accent" />
                            Fin le {expiresDate}
                        </p>
                        <p className="mt-1 text-white/60">{countdown}</p>
                    </div>

                    <Link
                        to={`/jobs/${job?.id}`}
                        className="inline-flex justify-center rounded-full bg-white/5 px-5 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-accent"
                    >
                        Voir l'offre
                    </Link>
                    <SaveButton isSaved={isSaved} saving={saving} onToggle={onToggleSaved} />
                </div>
            </div>
        </motion.article>
    );
}
