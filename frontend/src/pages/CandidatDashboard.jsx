import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    CheckCircle2,
    Clock3,
    Eye,
    FileText,
    MapPin,
    RefreshCw,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
};

const statusBadgeClasses = {
    en_attente: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    acceptee: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    refusee: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
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
    if (status === 'en_attente') return 'En attente';
    if (status === 'acceptee') return 'Acceptee';
    if (status === 'refusee') return 'Refusee';
    return status ?? '-';
}

function profileCompletionPercent(user) {
    const profile = user?.candidatProfile ?? user?.profile ?? {};
    const fields = [
        user?.name,
        user?.email,
        profile?.ville,
        profile?.experience,
        profile?.poste_recherche,
        profile?.cv_path,
    ];
    const completed = fields.filter((value) => value !== null && value !== undefined && String(value).trim() !== '').length;
    return Math.round((completed / fields.length) * 100);
}

export default function CandidatDashboard() {
    const [applications, setApplications] = useState([]);
    const [currentUser, setCurrentUser] = useState(() => parseStoredUser());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const [applicationsResponse, meResponse] = await Promise.all([
                api.get('/mes-postulations'),
                api.get('/auth/me').catch(() => null),
            ]);

            setApplications(extractApplications(applicationsResponse?.data));

            if (meResponse?.data?.user) {
                setCurrentUser(meResponse.data.user);
                localStorage.setItem('user', JSON.stringify(meResponse.data.user));
            }
        } catch (requestError) {
            setError(
                requestError?.response?.data?.message
                || "Impossible de charger le dashboard candidat."
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
        const sent = applications.length;
        const accepted = applications.filter((item) => item.status === 'acceptee').length;
        const rejected = applications.filter((item) => item.status === 'refusee').length;
        const pending = applications.filter((item) => item.status === 'en_attente').length;

        return [
            { label: 'Envoyees', value: sent, icon: FileText },
            { label: 'Acceptees', value: accepted, icon: CheckCircle2 },
            { label: 'Refusees', value: rejected, icon: XCircle },
            { label: 'En attente', value: pending, icon: Clock3 },
        ];
    }, [applications]);

    const completion = profileCompletionPercent(currentUser);

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
                        <h1 className="text-3xl md:text-4xl font-black text-white">Dashboard Candidat</h1>
                        <p className="text-white/60 mt-2">
                            Suivi des candidatures, resultats quiz et avancement du profil.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={loadDashboard}
                        className="inline-flex items-center gap-2 rounded-full border border-borderGlass bg-surface px-5 py-2.5 text-sm text-white/80 hover:text-white hover:border-accent/50 transition-colors"
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
                        <p className="text-white/60">Chargement du dashboard...</p>
                    </div>
                ) : (
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
                        className="space-y-8"
                    >
                        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                            <div className="mb-5 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Completion du profil</h2>
                                    <p className="mt-1 text-sm text-white/55">
                                        Un profil complet augmente la qualite des candidatures.
                                    </p>
                                </div>
                                <span className="rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-semibold text-accent">
                                    {completion}%
                                </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                <div
                                    className="h-full rounded-full bg-accent transition-all"
                                    style={{ width: `${completion}%` }}
                                />
                            </div>

                            <p className="mt-3 text-xs uppercase tracking-wider text-white/45">
                                Basee sur nom, email, ville, experience, poste recherche et CV.
                            </p>
                        </section>

                        <section className="rounded-3xl border border-borderGlass bg-surface p-6 md:p-8">
                            <div className="mb-5">
                                <h2 className="text-xl font-bold text-white">Mes postulations</h2>
                                <p className="text-white/55 text-sm mt-1">
                                    Historique des candidatures et score des quiz si disponible.
                                </p>
                            </div>

                            {applications.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-borderGlass px-5 py-10 text-center text-white/55">
                                    Aucune postulation envoyee.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-borderGlass text-xs uppercase tracking-wider text-white/50">
                                                <th className="px-4 py-3 font-semibold">Offre</th>
                                                <th className="px-4 py-3 font-semibold">Ville</th>
                                                <th className="px-4 py-3 font-semibold">Statut</th>
                                                <th className="px-4 py-3 font-semibold">Score quiz</th>
                                                <th className="px-4 py-3 font-semibold">Date</th>
                                                <th className="px-4 py-3 font-semibold">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {applications.map((application) => {
                                                const offer = application.jobOffer ?? application.job_offer ?? {};
                                                const offerId = offer.id ?? offer?.id;
                                                const hasQuiz = Boolean(offer?.quiz || offer?.quiz_exists);
                                                const shouldPassQuiz = application.quiz_score === null && hasQuiz && offerId;
                                                return (
                                                    <tr key={application.id} className="border-b border-white/5 align-top text-white/80">
                                                        <td className="px-4 py-4">
                                                            <p className="font-semibold text-white">{offer.titre_poste ?? 'Offre'}</p>
                                                            <p className="mt-1 text-xs text-white/45">{offer.type_contrat ?? '-'}</p>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <span className="inline-flex items-center gap-1.5 text-white/75">
                                                                <MapPin size={14} className="text-accent" />
                                                                {offer.ville ?? '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <span
                                                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                                                    statusBadgeClasses[application.status] || 'bg-white/10 text-white/80 border-white/25'
                                                                }`}
                                                            >
                                                                {toReadableStatus(application.status)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 text-white">
                                                            {application.quiz_score ?? '-'}
                                                        </td>
                                                        <td className="px-4 py-4 text-white/75">
                                                            {formatDate(application.created_at)}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex flex-wrap gap-2">
                                                                {shouldPassQuiz && (
                                                                    <Link
                                                                        to={`/candidat/quiz/${offerId}`}
                                                                        className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent hover:text-white transition-colors"
                                                                    >
                                                                        <ShieldCheck size={13} />
                                                                        Passer le quiz
                                                                    </Link>
                                                                )}
                                                                <Link
                                                                    to={`/jobs/${offerId ?? ''}`}
                                                                    className="inline-flex items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:text-white hover:border-accent/50 transition-colors"
                                                                >
                                                                    <Eye size={13} />
                                                                    Voir offre
                                                                </Link>
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
                    </motion.div>
                )}
            </main>
        </motion.div>
    );
}
