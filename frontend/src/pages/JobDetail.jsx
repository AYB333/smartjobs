import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Briefcase,
    CalendarClock,
    FileText,
    MapPin,
    ShieldCheck,
    Upload,
    Sparkles,
    X,
    BadgeCheck,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../api/axios';

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

function formatSalary(value) {
    if (value === null || value === undefined || value === '') return 'Non specifie';
    return `${Number(value).toLocaleString('fr-FR')} MAD`;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('fr-FR');
}

function getCountdownParts(expiresAt) {
    if (!expiresAt) return { expired: false, label: '-' };

    const target = new Date(expiresAt).getTime();
    if (Number.isNaN(target)) return { expired: false, label: '-' };

    const diff = target - Date.now();
    if (diff <= 0) return { expired: true, label: 'Expiree' };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    return { expired: false, label: `${days}j ${hours}h ${minutes}m` };
}

function getContractBadgeClass(contractType) {
    if (contractType === 'CDI') return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40 shadow-[0_0_18px_rgba(52,211,153,0.15)]';
    if (contractType === 'CDD') return 'bg-sky-500/15 text-sky-200 border-sky-400/40 shadow-[0_0_18px_rgba(56,189,248,0.15)]';
    if (contractType === 'Extra') return 'bg-orange-500/15 text-orange-200 border-orange-400/40 shadow-[0_0_18px_rgba(251,146,60,0.15)]';
    if (contractType === 'Saisonnier') return 'bg-violet-500/15 text-violet-200 border-violet-400/40 shadow-[0_0_18px_rgba(167,139,250,0.15)]';
    return 'bg-white/10 text-white/80 border-white/25';
}

function getStatusBadgeClass(status) {
    if (status === 'active') return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40 shadow-[0_0_16px_rgba(52,211,153,0.15)]';
    if (status === 'expired') return 'bg-rose-500/15 text-rose-200 border-rose-400/40 shadow-[0_0_16px_rgba(244,63,94,0.15)]';
    if (status === 'suspended') return 'bg-amber-500/15 text-amber-200 border-amber-400/40 shadow-[0_0_16px_rgba(251,191,36,0.15)]';
    return 'bg-white/10 text-white/80 border-white/25';
}

function normalizeStatus(status) {
    if (status === 'active') return 'Active';
    if (status === 'expired') return 'Expiree';
    if (status === 'suspended') return 'Suspendue';
    return status ?? '-';
}

export default function JobDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [offer, setOffer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hasQuiz, setHasQuiz] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [countdownTick, setCountdownTick] = useState(0);

    const currentUser = useMemo(() => parseStoredUser(), []);
    const isAuthenticated = Boolean(localStorage.getItem('token'));

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdownTick((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

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

    const countdown = getCountdownParts(offer?.expires_at);
    const etablissement = offer?.recruteur?.recruteurProfile?.nom_etablissement || 'Etablissement non renseigne';
    const isRecruteur = currentUser?.role === 'recruteur';

    const handleOpenPostuler = () => {
        if (!isAuthenticated) {
            navigate('/auth', { replace: true });
            return;
        }

        if (currentUser?.role !== 'candidat') {
            setSubmitError('La postulation est reservee aux comptes candidats.');
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

        if (!selectedFile) {
            setSubmitError('Veuillez selectionner un fichier PDF.');
            return;
        }

        if (selectedFile.type !== 'application/pdf') {
            setSubmitError('Format invalide: seul le PDF est autorise.');
            return;
        }

        if (selectedFile.size > 2 * 1024 * 1024) {
            setSubmitError('Le fichier depasse 2MB.');
            return;
        }

        const formData = new FormData();
        formData.append('cv', selectedFile);
        setSubmitLoading(true);

        try {
            const response = await api.post(`/offres/${id}/postuler`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const requiresQuiz = Boolean(response?.data?.has_quiz ?? hasQuiz);
            setSuccessMessage(
                requiresQuiz
                    ? 'Postulation envoyee avec succes. Vous pouvez passer le quiz.'
                    : 'Postulation envoyee avec succes.'
            );
            setIsUploadOpen(false);
            setTimeout(() => {
                navigate(requiresQuiz ? `/candidat/quiz/${id}` : '/candidat/dashboard', { replace: true });
            }, 900);
        } catch (requestError) {
            setSubmitError(
                requestError?.response?.data?.message
                || "Impossible d'envoyer la postulation."
            );
        } finally {
            setSubmitLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-obsidian">
            <Navbar />

            {loading ? (
                <main className="container mx-auto px-6 pt-32 pb-16">
                    <div className="rounded-3xl border border-borderGlass bg-surface px-6 py-16 text-center">
                        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                        <p className="text-white/60">Chargement des details...</p>
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
                    <section className="relative w-full overflow-hidden border-b border-borderGlass pt-28 pb-12">
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(232,101,26,0.22),transparent_40%),linear-gradient(135deg,#0A2540_20%,#0B0F19_70%)]" />
                        <div className="container relative z-10 mx-auto px-6">
                            <h1 className="max-w-4xl text-4xl md:text-5xl font-black leading-tight text-white">
                                {offer?.titre_poste}
                            </h1>
                            <p className="mt-4 text-accent text-lg md:text-xl font-medium">
                                {etablissement} · {offer?.ville}
                            </p>

                            <div className="mt-6 flex flex-wrap gap-2.5">
                                <span className={`inline-flex rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider ${getContractBadgeClass(offer?.type_contrat)}`}>
                                    {offer?.type_contrat}
                                </span>
                                <span className={`inline-flex rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider ${getStatusBadgeClass(offer?.status)}`}>
                                    {normalizeStatus(offer?.status)}
                                </span>
                                {hasQuiz && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent shadow-[0_0_18px_rgba(232,101,26,0.2)]">
                                        <ShieldCheck size={12} />
                                        Quiz requis
                                    </span>
                                )}
                            </div>
                        </div>
                    </section>

                    <main className="container mx-auto px-6 py-10">
                        <div className="grid gap-8 lg:grid-cols-3">
                            <section className="lg:col-span-2 space-y-6">
                                <div className="rounded-3xl border border-borderGlass bg-surface p-6 md:p-7">
                                    <h2 className="text-lg font-semibold text-white mb-4">Informations principales</h2>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div className="rounded-2xl border border-borderGlass bg-white/5 px-4 py-3">
                                            <p className="text-xs uppercase tracking-wider text-white/50">Ville</p>
                                            <p className="mt-1 inline-flex items-center gap-1.5 text-white">
                                                <MapPin size={14} className="text-accent" />
                                                {offer?.ville}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl border border-borderGlass bg-white/5 px-4 py-3">
                                            <p className="text-xs uppercase tracking-wider text-white/50">Salaire</p>
                                            <p className="mt-1 inline-flex items-center gap-1.5 text-white">
                                                <Briefcase size={14} className="text-accent" />
                                                {formatSalary(offer?.salaire)}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl border border-borderGlass bg-white/5 px-4 py-3">
                                            <p className="text-xs uppercase tracking-wider text-white/50">Date limite</p>
                                            <p className="mt-1 inline-flex items-center gap-1.5 text-white">
                                                <CalendarClock size={14} className="text-accent" />
                                                {formatDate(offer?.expires_at)}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl border border-borderGlass bg-white/5 px-4 py-3">
                                            <p className="text-xs uppercase tracking-wider text-white/50">Temps restant</p>
                                            <p key={countdownTick} className={`mt-1 font-semibold ${countdown.expired ? 'text-rose-300' : 'text-emerald-300'}`}>
                                                {countdown.label}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-borderGlass bg-surface p-6 md:p-7">
                                    <h2 className="text-lg font-semibold text-white mb-3">Description</h2>
                                    <p className="whitespace-pre-line leading-relaxed text-white/70">
                                        {offer?.description}
                                    </p>
                                </div>
                            </section>

                            <aside className="lg:col-span-1">
                                <div className="group sticky top-32">
                                    <motion.div
                                        className="pointer-events-none absolute -inset-[1px] rounded-3xl opacity-70 blur-[0.4px]"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(232,101,26,0.9), rgba(56,189,248,0.2), rgba(232,101,26,0.8))',
                                            backgroundSize: '220% 220%',
                                        }}
                                        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                                        transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
                                    />

                                    <div className="relative rounded-3xl border border-borderGlass/80 bg-surface/95 p-6 backdrop-blur-xl transition-all duration-300 group-hover:shadow-[0_0_35px_rgba(232,101,26,0.16)]">
                                        <h3 className="text-lg font-semibold text-white">Postuler a cette offre</h3>
                                        <p className="mt-2 text-sm text-white/70">
                                            Envoyez votre CV en PDF et suivez l'avancement depuis votre dashboard.
                                        </p>

                                        <button
                                            type="button"
                                            onClick={handleOpenPostuler}
                                            disabled={isRecruteur}
                                            title={isRecruteur ? 'Vous êtes recruteur' : undefined}
                                            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/45"
                                        >
                                            <Upload size={16} />
                                            {isRecruteur ? 'Vous êtes recruteur' : 'Postuler maintenant'}
                                        </button>

                                        <div className="mt-4 rounded-xl border border-borderGlass bg-obsidian/50 p-3 text-xs text-white/60">
                                            <p className="inline-flex items-center gap-1.5">
                                                <Sparkles size={13} className="text-accent" />
                                                PDF uniquement · 2MB max
                                            </p>
                                            <p className="mt-1 inline-flex items-center gap-1.5">
                                                <BadgeCheck size={13} className="text-accent" />
                                                Reponse visible dans votre dashboard candidat
                                            </p>
                                        </div>

                                        {submitError && <p className="mt-3 text-sm text-rose-300">{submitError}</p>}
                                        {successMessage && <p className="mt-3 text-sm text-emerald-300">{successMessage}</p>}
                                    </div>
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
                                    <h3 className="text-xl font-semibold text-white">Envoyer votre CV</h3>
                                    <p className="mt-1 text-sm text-white/60">PDF uniquement, taille max 2MB.</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsUploadOpen(false)}
                                    className="rounded-full border border-borderGlass bg-white/5 p-2 text-white/70 hover:text-white hover:border-accent/50 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitPostulation} className="space-y-4">
                                <label className="block rounded-2xl border border-dashed border-borderGlass bg-surface p-4 text-center">
                                    <input
                                        type="file"
                                        accept="application/pdf,.pdf"
                                        onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                                        className="hidden"
                                    />
                                    <span className="inline-flex items-center gap-2 text-sm text-white/80">
                                        <FileText size={16} className="text-accent" />
                                        {selectedFile ? selectedFile.name : 'Choisir un fichier PDF'}
                                    </span>
                                </label>

                                {submitError && <p className="text-sm text-rose-300">{submitError}</p>}

                                <button
                                    type="submit"
                                    disabled={submitLoading}
                                    className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-70"
                                >
                                    {submitLoading ? 'Envoi en cours...' : 'Confirmer la postulation'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
