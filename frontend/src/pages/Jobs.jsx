import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import JobCard from '../components/JobCard';
import api from '../api/axios';
import { useToast } from '../context/useAppExperience';
import { extractSavedOfferIds } from '../utils/savedJobs';

const filterVariants = {
    open: { opacity: 1, height: 'auto', marginTop: 16 },
    collapsed: { opacity: 0, height: 0, marginTop: 0 },
};

const sortOptions = [
    { value: 'recent', label: 'Plus récentes' },
    { value: 'salary_high', label: 'Salaire élevé' },
    { value: 'expires_soon', label: 'Expire bientôt' },
    { value: 'with_quiz', label: 'Avec quiz' },
];

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

function toTimestamp(value, fallback = 0) {
    if (!value) return fallback;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? fallback : time;
}

function matchSalaryRange(job, minValue, maxValue) {
    const salary = Number(job?.salaire);
    const hasSalary = Number.isFinite(salary);
    const min = minValue === '' ? null : Number(minValue);
    const max = maxValue === '' ? null : Number(maxValue);

    if ((min !== null || max !== null) && !hasSalary) {
        return false;
    }

    if (min !== null && salary < min) {
        return false;
    }

    if (max !== null && salary > max) {
        return false;
    }

    return true;
}

function getInitialFilters(searchParams) {
    return {
        search: searchParams.get('search') || '',
        ville: searchParams.get('ville') || '',
        type_contrat: searchParams.get('type_contrat') || '',
        salaireMin: searchParams.get('salaireMin') || '',
        salaireMax: searchParams.get('salaireMax') || '',
    };
}

function formatSalaryFilter(value) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount.toLocaleString('fr-FR') : value;
}

function getInitialFiltersOpen() {
    if (typeof window === 'undefined') {
        return true;
    }

    return window.innerWidth >= 768;
}

function sortOffers(offers, sortOrder) {
    const sorted = [...offers];

    if (sortOrder === 'salary_high') {
        return sorted.sort((first, second) => Number(second?.salaire || 0) - Number(first?.salaire || 0));
    }

    if (sortOrder === 'expires_soon') {
        return sorted.sort((first, second) => (
            toTimestamp(first?.expires_at, Number.MAX_SAFE_INTEGER)
            - toTimestamp(second?.expires_at, Number.MAX_SAFE_INTEGER)
        ));
    }

    if (sortOrder === 'with_quiz') {
        return sorted.sort((first, second) => {
            const firstQuiz = first?.quiz_exists || first?.quiz ? 1 : 0;
            const secondQuiz = second?.quiz_exists || second?.quiz ? 1 : 0;
            if (firstQuiz !== secondQuiz) return secondQuiz - firstQuiz;
            return toTimestamp(second?.created_at, Number(second?.id || 0)) - toTimestamp(first?.created_at, Number(first?.id || 0));
        });
    }

    return sorted.sort((first, second) => (
        toTimestamp(second?.created_at, Number(second?.id || 0))
        - toTimestamp(first?.created_at, Number(first?.id || 0))
    ));
}

function JobSkeletonCard({ index }) {
    return (
        <div
            key={`job-skeleton-${index}`}
            className="rounded-3xl border border-borderGlass bg-surface p-4 backdrop-blur-xl animate-pulse"
        >
            <div className="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)_190px]">
                <div className="h-40 rounded-2xl bg-white/10 lg:h-auto"></div>
                <div className="py-1">
                    <div className="mb-3 h-5 w-32 rounded-full bg-white/10"></div>
                    <div className="mb-3 h-4 w-44 rounded bg-white/10"></div>
                    <div className="mb-5 h-7 w-3/4 rounded bg-white/10"></div>
                    <div className="flex flex-wrap gap-2">
                        <div className="h-8 w-24 rounded-full bg-white/10"></div>
                        <div className="h-8 w-20 rounded-full bg-white/10"></div>
                        <div className="h-8 w-28 rounded-full bg-white/10"></div>
                    </div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                    <div className="mb-3 h-4 w-28 rounded bg-white/10 lg:ml-auto"></div>
                    <div className="mb-8 h-4 w-24 rounded bg-white/10 lg:ml-auto"></div>
                    <div className="h-10 w-full rounded-full bg-white/10"></div>
                </div>
            </div>
        </div>
    );
}

export default function Jobs() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [offres, setOffres] = useState([]);
    const [savedOfferIds, setSavedOfferIds] = useState([]);
    const [savingOfferId, setSavingOfferId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(getInitialFiltersOpen);
    const [sortOrder, setSortOrder] = useState('recent');

    const [filterData, setFilterData] = useState({ villes: [], types_contrat: [] });
    const [filtersLoading, setFiltersLoading] = useState(true);

    const [filters, setFilters] = useState(() => getInitialFilters(searchParams));
    const currentUser = useMemo(() => parseStoredUser(), []);
    const isCandidate = currentUser?.role === 'candidat';

    const fetchJobs = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const params = {};
            if (filters.search.trim()) params.search = filters.search.trim();
            if (filters.ville) params.ville = filters.ville;
            if (filters.type_contrat) params.type_contrat = filters.type_contrat;

            const response = await api.get('/offres', { params });
            const rawOffers = extractOffers(response?.data);
            const filteredOffers = rawOffers.filter((job) => matchSalaryRange(job, filters.salaireMin, filters.salaireMax));
            setOffres(filteredOffers);
        } catch (requestError) {
            setError(
                requestError?.response?.data?.message
                || 'Erreur lors du chargement des offres.'
            );
            setOffres([]);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            fetchJobs();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [fetchJobs]);

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const response = await api.get('/offres/filters');
                setFilterData({
                    villes: response.data.villes || [],
                    types_contrat: response.data.types_contrat || [],
                });
            } catch (err) {
                console.error('Filter fetch error', err);
            } finally {
                setFiltersLoading(false);
            }
        };
        fetchFilters();
    }, []);

    useEffect(() => {
        if (!isCandidate) {
            return undefined;
        }

        const timeoutId = window.setTimeout(async () => {
            try {
                const response = await api.get('/saved-offers');
                setSavedOfferIds(extractSavedOfferIds(response?.data));
            } catch {
                setSavedOfferIds([]);
            }
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [isCandidate]);

    const toggleSavedOffer = async (offerId) => {
        if (!isCandidate) {
            navigate('/auth?role=candidat&mode=login');
            return;
        }

        const isSaved = savedOfferIds.includes(Number(offerId));
        setSavingOfferId(offerId);

        try {
            if (isSaved) {
                await api.delete(`/offres/${offerId}/save`);
                setSavedOfferIds((current) => current.filter((id) => Number(id) !== Number(offerId)));
            } else {
                await api.post(`/offres/${offerId}/save`);
                setSavedOfferIds((current) => [...new Set([...current, Number(offerId)])]);
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
            setSavingOfferId(null);
        }
    };

    const resetFilters = useCallback(() => {
        setFilters({
            search: '',
            ville: '',
            type_contrat: '',
            salaireMin: '',
            salaireMax: '',
        });
    }, []);

    const clearFilter = (field) => {
        setFilters((current) => ({ ...current, [field]: '' }));
    };

    const activeFilterChips = useMemo(() => {
        const chips = [];

        if (filters.search.trim()) {
            chips.push({ key: 'search', label: `Recherche: ${filters.search.trim()}` });
        }

        if (filters.ville) {
            chips.push({ key: 'ville', label: `Ville: ${filters.ville}` });
        }

        if (filters.type_contrat) {
            chips.push({ key: 'type_contrat', label: `Contrat: ${filters.type_contrat}` });
        }

        if (filters.salaireMin) {
            chips.push({ key: 'salaireMin', label: `Min: ${formatSalaryFilter(filters.salaireMin)} MAD` });
        }

        if (filters.salaireMax) {
            chips.push({ key: 'salaireMax', label: `Max: ${formatSalaryFilter(filters.salaireMax)} MAD` });
        }

        return chips;
    }, [filters]);

    const sortedOffers = useMemo(() => sortOffers(offres, sortOrder), [offres, sortOrder]);
    const resultCount = sortedOffers.length;
    const hasActiveFilters = activeFilterChips.length > 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen bg-obsidian flex flex-col"
        >
            <Navbar />

            <div className="flex-1 container mx-auto px-6 py-32">
                <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                            <SlidersHorizontal size={13} />
                            Recherche CHR
                        </p>
                        <h1 className="text-3xl font-black text-white md:text-5xl">Offres disponibles</h1>
                        <p className="mt-2 text-white/60">
                            {loading ? 'Chargement des offres...' : `${resultCount} offres trouvées`}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setFiltersOpen((current) => !current)}
                        className="inline-flex w-fit items-center gap-2 rounded-full border border-borderGlass bg-surface px-4 py-2.5 text-sm font-semibold text-white/85 transition-colors hover:border-accent/50 hover:text-white md:hidden"
                    >
                        <Filter size={16} />
                        Filtres
                        {filtersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                <div className="flex flex-col gap-8 md:flex-row">
                    <aside className="w-full md:w-1/4">
                        <div className="rounded-3xl border border-borderGlass bg-surface p-6 backdrop-blur-xl md:sticky md:top-32">
                            <div
                                className="flex cursor-pointer items-center justify-between gap-3"
                                onClick={() => setFiltersOpen((prev) => !prev)}
                            >
                                <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                                    <Filter size={20} className="text-accent" />
                                    Filtres
                                </h2>
                                {filtersOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>

                            <AnimatePresence>
                                {filtersOpen && (
                                    <motion.div
                                        variants={filterVariants}
                                        initial="open"
                                        animate="open"
                                        exit="collapsed"
                                        className="overflow-hidden"
                                    >
                                        {filtersLoading ? (
                                            <div className="py-8 text-center text-sm text-white/50">
                                                <div className="mb-2 inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                                                <p>Chargement des filtres...</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-6">
                                                    <label className="mb-3 block text-sm font-medium uppercase tracking-wider text-white/50">Ville</label>
                                                    <div className="flex flex-col gap-2">
                                                        {['Tous', ...filterData.villes].map((ville) => (
                                                            <label key={ville} className="group flex cursor-pointer items-center gap-3">
                                                                <input
                                                                    type="radio"
                                                                    name="ville"
                                                                    checked={filters.ville === ville || (ville === 'Tous' && !filters.ville)}
                                                                    onChange={() => setFilters((prev) => ({ ...prev, ville: ville === 'Tous' ? '' : ville }))}
                                                                    className="hidden"
                                                                />
                                                                <div className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                                                                    filters.ville === ville || (ville === 'Tous' && !filters.ville)
                                                                        ? 'border-accent'
                                                                        : 'border-white/20 group-hover:border-white/50'
                                                                }`}>
                                                                    {(filters.ville === ville || (ville === 'Tous' && !filters.ville)) && (
                                                                        <div className="h-2 w-2 rounded-full bg-accent" />
                                                                    )}
                                                                </div>
                                                                <span className={`${
                                                                    filters.ville === ville || (ville === 'Tous' && !filters.ville)
                                                                        ? 'text-white'
                                                                        : 'text-white/70 group-hover:text-white'
                                                                }`}>
                                                                    {ville}
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="mb-6">
                                                    <label className="mb-3 block text-sm font-medium uppercase tracking-wider text-white/50">Type de contrat</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {['Tous', ...filterData.types_contrat].map((contrat) => (
                                                            <button
                                                                key={contrat}
                                                                type="button"
                                                                onClick={() => setFilters((prev) => ({ ...prev, type_contrat: contrat === 'Tous' ? '' : contrat }))}
                                                                className={`rounded-full px-4 py-2 text-sm transition-all ${
                                                                    filters.type_contrat === contrat || (contrat === 'Tous' && !filters.type_contrat)
                                                                        ? 'bg-accent font-medium text-white'
                                                                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                                                                }`}
                                                            >
                                                                {contrat}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="mb-3 block text-sm font-medium uppercase tracking-wider text-white/50">
                                                        Salaire
                                                    </label>
                                                    <div className="grid gap-3">
                                                        <label className="salary-filter-field block rounded-2xl border border-borderGlass bg-obsidian/60 px-3.5 py-3 transition-colors focus-within:border-accent/60 focus-within:bg-obsidian/70">
                                                            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/45">
                                                                Salaire minimum
                                                            </span>
                                                            <span className="flex min-w-0 items-center gap-3">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    placeholder="0"
                                                                    value={filters.salaireMin}
                                                                    onChange={(event) => setFilters((prev) => ({ ...prev, salaireMin: event.target.value }))}
                                                                    className="w-full min-w-0 flex-1 border-none bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/35"
                                                                />
                                                                <span className="shrink-0 whitespace-nowrap rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-accent">
                                                                    MAD
                                                                </span>
                                                            </span>
                                                        </label>

                                                        <label className="salary-filter-field block rounded-2xl border border-borderGlass bg-obsidian/60 px-3.5 py-3 transition-colors focus-within:border-accent/60 focus-within:bg-obsidian/70">
                                                            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/45">
                                                                Salaire maximum
                                                            </span>
                                                            <span className="flex min-w-0 items-center gap-3">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    placeholder="9000"
                                                                    value={filters.salaireMax}
                                                                    onChange={(event) => setFilters((prev) => ({ ...prev, salaireMax: event.target.value }))}
                                                                    className="w-full min-w-0 flex-1 border-none bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/35"
                                                                />
                                                                <span className="shrink-0 whitespace-nowrap rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-accent">
                                                                    MAD
                                                                </span>
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={resetFilters}
                                                    className="mt-6 w-full rounded-full border border-borderGlass bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-accent/50 hover:text-white"
                                                >
                                                    Réinitialiser les filtres
                                                </button>
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </aside>

                    <main className="w-full md:w-3/4">
                        <div className="mb-5 rounded-full border border-borderGlass bg-surface p-2 shadow-lg backdrop-blur-xl">
                            <div className="flex w-full items-center pl-6">
                                <Search className="mr-3 text-white/40" />
                                <input
                                    type="text"
                                    placeholder="Rechercher un métier, une compétence..."
                                    className="w-full border-none bg-transparent text-white placeholder-white/40 focus:outline-none"
                                    value={filters.search}
                                    onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-wrap gap-2">
                                {activeFilterChips.map((chip) => (
                                    <button
                                        key={chip.key}
                                        type="button"
                                        onClick={() => clearFilter(chip.key)}
                                        className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
                                    >
                                        {chip.label}
                                        <X size={12} />
                                    </button>
                                ))}

                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="inline-flex items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:border-accent/50 hover:text-white"
                                    >
                                        Réinitialiser
                                    </button>
                                )}
                            </div>

                            <label className="inline-flex w-full items-center justify-between gap-3 rounded-2xl border border-borderGlass bg-surface px-4 py-3 text-sm text-white/70 lg:w-auto">
                                Trier
                                <select
                                    value={sortOrder}
                                    onChange={(event) => setSortOrder(event.target.value)}
                                    className="bg-transparent font-semibold text-white outline-none"
                                >
                                    {sortOptions.map((option) => (
                                        <option key={option.value} value={option.value} className="bg-deepNavy text-white">
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        {error && (
                            <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-200">
                                {error}
                            </div>
                        )}

                        <motion.div
                            key={`${JSON.stringify(filters)}-${sortOrder}`}
                            initial="hidden"
                            animate="visible"
                            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
                            className="grid grid-cols-1 gap-5"
                        >
                            {loading && Array.from({ length: 6 }, (_, index) => (
                                <JobSkeletonCard key={index} index={index} />
                            ))}

                            {!loading && sortedOffers.length > 0 && sortedOffers.map((job) => (
                                <JobCard
                                    key={job.id}
                                    job={job}
                                    variant="list"
                                    isSaved={savedOfferIds.includes(Number(job.id))}
                                    saving={savingOfferId === job.id}
                                    onToggleSaved={isCandidate ? () => toggleSavedOffer(job.id) : undefined}
                                />
                            ))}

                            {!loading && sortedOffers.length === 0 && !error && (
                                <div className="col-span-full rounded-3xl border border-borderGlass bg-surface px-6 py-20 text-center">
                                    <h2 className="text-2xl font-black text-white">Aucune offre trouvée</h2>
                                    <p className="mx-auto mt-2 max-w-md text-white/60">
                                        Essayez de modifier vos filtres ou votre recherche.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="mt-6 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
                                    >
                                        Réinitialiser les filtres
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </main>
                </div>
            </div>

            <Footer />
        </motion.div>
    );
}
