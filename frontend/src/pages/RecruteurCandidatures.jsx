import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
    AlertTriangle,
    Check,
    Crown,
    Download,
    MapPin,
    RefreshCw,
    X,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api/axios';

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

function toReadableStatus(status) {
    if (status === 'en_attente') return 'En attente';
    if (status === 'acceptee') return 'Acceptee';
    if (status === 'refusee') return 'Refusee';
    return status ?? '-';
}

const statusBadgeClasses = {
    en_attente: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    acceptee: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    refusee: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
};

export default function RecruteurCandidatures() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [offers, setOffers] = useState([]);
    const [selectedOfferId, setSelectedOfferId] = useState(searchParams.get('offer') || '');
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [error, setError] = useState('');
    const [quotaWarning, setQuotaWarning] = useState('');
    const [subscription, setSubscription] = useState({
        is_premium: false,
        expires_at: null,
        days_remaining: 0,
    });

    const backendBase = useMemo(() => getBackendBaseUrl(), []);

    const loadBaseData = useCallback(async () => {
        setError('');
        setLoading(true);

        try {
            const [offersResponse, subscriptionResponse] = await Promise.all([
                api.get('/mes-offres'),
                api.get('/payment/subscription').catch(() => null),
            ]);

            const loadedOffers = extractPaginatedList(offersResponse?.data);
            setOffers(loadedOffers);

            if (subscriptionResponse?.data?.data) {
                setSubscription(subscriptionResponse.data.data);
            }

            if (!selectedOfferId && loadedOffers.length > 0) {
                const firstOfferId = String(loadedOffers[0].id);
                setSelectedOfferId(firstOfferId);
                setSearchParams({ offer: firstOfferId });
            }
        } catch (requestError) {
            setError(requestError?.response?.data?.message || "Impossible de charger les offres du recruteur.");
        } finally {
            setLoading(false);
        }
    }, [selectedOfferId, setSearchParams]);

    const loadApplications = useCallback(async (offerId) => {
        if (!offerId) {
            setApplications([]);
            return;
        }

        setLoading(true);
        setError('');
        setQuotaWarning('');

        try {
            const response = await api.get(`/offres/${offerId}/postulants`);
            setApplications(extractPaginatedList(response?.data));
        } catch (requestError) {
            setApplications([]);

            if (requestError?.response?.status === 403) {
                const message = requestError?.response?.data?.message || 'Acces limite par le quota journalier.';
                setQuotaWarning(message);
            } else {
                setError(requestError?.response?.data?.message || 'Impossible de charger les candidatures.');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadBaseData();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [loadBaseData]);

    useEffect(() => {
        const offerFromParams = searchParams.get('offer') || '';
        if (offerFromParams && offerFromParams !== selectedOfferId) {
            const timeoutId = window.setTimeout(() => {
                setSelectedOfferId(offerFromParams);
            }, 0);

            return () => window.clearTimeout(timeoutId);
        }
    }, [searchParams, selectedOfferId]);

    useEffect(() => {
        if (selectedOfferId) {
            const timeoutId = window.setTimeout(() => {
                setSearchParams({ offer: String(selectedOfferId) });
                loadApplications(selectedOfferId);
            }, 0);

            return () => window.clearTimeout(timeoutId);
        }
    }, [loadApplications, selectedOfferId, setSearchParams]);

    const updateStatus = async (applicationId, status) => {
        setUpdatingId(applicationId);
        setError('');

        try {
            await api.patch(`/postulations/${applicationId}/status`, { status });
            if (selectedOfferId) {
                await loadApplications(selectedOfferId);
            }
        } catch (requestError) {
            setError(requestError?.response?.data?.message || 'Echec de la mise a jour du statut.');
        } finally {
            setUpdatingId(null);
        }
    };

    const openCv = (cvUrl) => {
        window.open(cvUrl, '_blank', 'noopener,noreferrer');
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
                <section className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-white">Candidatures</h1>
                        <p className="mt-2 text-white/60">Consultez les postulants et validez les profils.</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            loadBaseData();
                            if (selectedOfferId) loadApplications(selectedOfferId);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-borderGlass bg-surface px-5 py-2.5 text-sm text-white/80 hover:text-white hover:border-accent/50 transition-colors"
                    >
                        <RefreshCw size={16} />
                        Actualiser
                    </button>
                </section>

                {!subscription.is_premium && (
                    <section className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
                        <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-200">
                            <Crown size={15} />
                            Mode non-premium actif
                        </p>
                        <p className="mt-1 text-sm text-amber-100/85">
                            La consultation des profils peut etre limitee par quota journalier.
                        </p>
                    </section>
                )}

                {quotaWarning && (
                    <section className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-100">
                        <p className="inline-flex items-center gap-2 font-semibold text-amber-200">
                            <AlertTriangle size={15} />
                            Quota atteint
                        </p>
                        <p className="mt-1 text-sm">{quotaWarning}</p>
                    </section>
                )}

                {error && (
                    <section className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-200">
                        {error}
                    </section>
                )}

                <section className="mb-6 rounded-3xl border border-borderGlass bg-surface p-5 md:p-6">
                    <label className="mb-2 block text-xs uppercase tracking-wider text-white/55">Choisir une offre</label>
                    <select
                        value={selectedOfferId}
                        onChange={(event) => setSelectedOfferId(event.target.value)}
                        className="w-full rounded-xl border border-borderGlass bg-obsidian/65 px-4 py-3 text-white focus:border-accent/50 focus:outline-none md:max-w-xl"
                    >
                        {offers.length === 0 && <option value="">Aucune offre disponible</option>}
                        {offers.map((offer) => (
                            <option key={offer.id} value={offer.id}>
                                {offer.titre_poste} - {offer.ville}
                            </option>
                        ))}
                    </select>
                </section>

                <section className="rounded-3xl border border-borderGlass bg-surface p-6 md:p-8">
                    <h2 className="mb-1 text-xl font-bold text-white">Liste des postulants</h2>
                    <p className="mb-5 text-sm text-white/55">Nom, ville, CV, score quiz et statut.</p>

                    {loading ? (
                        <div className="py-12 text-center">
                            <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                            <p className="text-white/60">Chargement des candidatures...</p>
                        </div>
                    ) : applications.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-borderGlass px-5 py-10 text-center text-white/55">
                            Aucune candidature a afficher.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-borderGlass text-xs uppercase tracking-wider text-white/50">
                                        <th className="px-4 py-3 font-semibold">Candidat</th>
                                        <th className="px-4 py-3 font-semibold">Ville</th>
                                        <th className="px-4 py-3 font-semibold">CV</th>
                                        <th className="px-4 py-3 font-semibold">Score quiz</th>
                                        <th className="px-4 py-3 font-semibold">Statut</th>
                                        <th className="px-4 py-3 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {applications.map((application) => {
                                        const candidate = application?.candidat || {};
                                        const profile = candidate?.candidatProfile || {};
                                        const cvPath = application?.cv_path || '';
                                        const cvUrl = cvPath ? `${backendBase}/storage/${cvPath}` : '';

                                        return (
                                            <tr key={application.id} className="border-b border-white/5 align-top text-white/80">
                                                <td className="px-4 py-4">
                                                    <p className="font-semibold text-white">{candidate?.name || 'Candidat'}</p>
                                                    <p className="mt-1 text-xs text-white/45">{candidate?.email || '-'}</p>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="inline-flex items-center gap-1.5 text-white/75">
                                                        <MapPin size={14} className="text-accent" />
                                                        {profile?.ville || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {cvUrl ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => openCv(cvUrl)}
                                                            className="inline-flex items-center gap-1.5 rounded-full border border-borderGlass bg-white/5 px-3 py-1.5 text-xs font-medium text-white/85 hover:text-white hover:border-accent/50"
                                                        >
                                                            <Download size={13} />
                                                            Telecharger
                                                        </button>
                                                    ) : (
                                                        <span className="text-white/45">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-white">{application?.quiz_score ?? '-'}</td>
                                                <td className="px-4 py-4">
                                                    <span
                                                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                                            statusBadgeClasses[application.status] || 'bg-white/10 text-white/80 border-white/25'
                                                        }`}
                                                    >
                                                        {toReadableStatus(application.status)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={updatingId === application.id}
                                                            onClick={() => updateStatus(application.id, 'acceptee')}
                                                            className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
                                                        >
                                                            <Check size={13} />
                                                            Accepter
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={updatingId === application.id}
                                                            onClick={() => updateStatus(application.id, 'refusee')}
                                                            className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
                                                        >
                                                            <X size={13} />
                                                            Refuser
                                                        </button>
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
            </main>
        </motion.div>
    );
}
