import { motion } from 'framer-motion';
import { Briefcase, Clock3, DollarSign, MapPin, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const itemVariants = {
    hidden: { y: 36, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 110, damping: 16 } },
};

const contractStyles = {
    CDI: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
    CDD: 'bg-sky-500/15 text-sky-200 border-sky-400/30',
    Extra: 'bg-orange-500/15 text-orange-200 border-orange-400/30',
    Saisonnier: 'bg-violet-500/15 text-violet-200 border-violet-400/30',
};

function getEtablissement(job) {
    return (
        job?.etablissement
        || job?.recruteur?.recruteurProfile?.nom_etablissement
        || 'Etablissement non precise'
    );
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

    return `${Number(salaire).toLocaleString('fr-FR')} MAD`;
}

export default function JobCard({ job }) {
    const urgent = isUrgent(job?.expires_at);
    const contractClass = contractStyles[job?.type_contrat] || 'bg-white/10 text-white/75 border-white/20';
    const countdown = getCountdown(job?.expires_at);
    const expiresDate = job?.expires_at ? new Date(job.expires_at).toLocaleDateString('fr-FR') : '-';
    const hasQuiz = Boolean(job?.quiz_exists || job?.quiz);
    const applicationsCount = Number(job?.applications_count ?? 0);

    return (
        <motion.article
            variants={itemVariants}
            className="group relative overflow-hidden rounded-3xl border border-borderGlass bg-surface p-6 backdrop-blur-xl transition-colors duration-500 hover:border-accent/40"
        >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/0 to-accent/0 transition-all duration-500 group-hover:from-accent/5 group-hover:to-transparent" />

            <div className="relative z-10">
                <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-xl font-bold text-white leading-snug">{job?.titre_poste || 'Offre'}</h3>
                        <p className="mt-1 text-sm font-medium text-white/60">{getEtablissement(job)}</p>
                    </div>

                    {urgent && (
                        <span className="inline-flex animate-pulse rounded-full border border-rose-400/40 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-200">
                            Urgent
                        </span>
                    )}
                </div>

                <div className="mb-6 flex flex-wrap gap-2.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80">
                        <MapPin size={13} className="text-accent" />
                        {job?.ville || '-'}
                    </span>

                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${contractClass}`}>
                        <Briefcase size={13} />
                        {job?.type_contrat || '-'}
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80">
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

                <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-white/45">
                        <p className="inline-flex items-center gap-1.5">
                            <Clock3 size={13} className="text-accent" />
                            Fin le {expiresDate}
                        </p>
                        <p className="mt-1 text-white/60">{countdown}</p>
                    </div>

                    <Link
                        to={`/jobs/${job?.id}`}
                        className="rounded-full bg-white/5 px-5 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-accent"
                    >
                        Voir l'offre
                    </Link>
                </div>
            </div>
        </motion.article>
    );
}
