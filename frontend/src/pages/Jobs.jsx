import { useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import JobCard from '../components/JobCard';
import api from '../api/axios';

const filterVariants = {
    open: { opacity: 1, height: 'auto', marginTop: 16 },
    collapsed: { opacity: 0, height: 0, marginTop: 0 },
};

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

function JobSkeletonCard({ index }) {
    return (
        <div
            key={`job-skeleton-${index}`}
            className="rounded-3xl border border-borderGlass bg-surface p-6 backdrop-blur-xl animate-pulse"
        >
            <div className="mb-4 h-6 w-3/4 rounded bg-white/10"></div>
            <div className="mb-6 h-4 w-1/2 rounded bg-white/10"></div>
            <div className="mb-6 flex gap-2">
                <div className="h-7 w-24 rounded-full bg-white/10"></div>
                <div className="h-7 w-20 rounded-full bg-white/10"></div>
                <div className="h-7 w-28 rounded-full bg-white/10"></div>
            </div>
            <div className="h-10 w-full rounded-xl bg-white/10"></div>
        </div>
    );
}

export default function Jobs() {
    const [offres, setOffres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(true);

    const [filterData, setFilterData] = useState({ villes: [], types_contrat: [] });
    const [filtersLoading, setFiltersLoading] = useState(true);

    const [filters, setFilters] = useState({
        search: '',
        ville: '',
        type_contrat: '',
        salaireMin: '',
        salaireMax: '',
    });

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
                    types_contrat: response.data.types_contrat || []
                });
            } catch (err) {
                console.error("Filter fetch error", err);
            } finally {
                setFiltersLoading(false);
            }
        };
        fetchFilters();
    }, []);

    const resetFilters = () => {
        setFilters({
            search: '',
            ville: '',
            type_contrat: '',
            salaireMin: '',
            salaireMax: '',
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen bg-obsidian flex flex-col"
        >
            <Navbar />

            <div className="flex-1 container mx-auto px-6 py-32 flex flex-col md:flex-row gap-8">
                <aside className="w-full md:w-1/4">
                    <div className="bg-surface backdrop-blur-xl border border-borderGlass rounded-3xl p-6 sticky top-32">
                        <div
                            className="flex justify-between items-center cursor-pointer mb-2"
                            onClick={() => setFiltersOpen((prev) => !prev)}
                        >
                            <h2 className="text-xl font-bold flex items-center gap-2">
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
                                        <div className="py-8 text-center text-white/50 text-sm">
                                            <div className="inline-block w-6 h-6 border-2 border-white/20 border-t-accent rounded-full animate-spin mb-2" />
                                            <p>Chargement des filtres...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mb-6">
                                                <label className="block text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">Ville</label>
                                                <div className="flex flex-col gap-2">
                                                    {['Tous', ...filterData.villes].map((ville) => (
                                                        <label key={ville} className="flex items-center gap-3 cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        name="ville"
                                                        checked={filters.ville === ville || (ville === 'Tous' && !filters.ville)}
                                                        onChange={() => setFilters((prev) => ({ ...prev, ville: ville === 'Tous' ? '' : ville }))}
                                                        className="hidden"
                                                    />
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                                        filters.ville === ville || (ville === 'Tous' && !filters.ville)
                                                            ? 'border-accent'
                                                            : 'border-white/20 group-hover:border-white/50'
                                                    }`}>
                                                        {(filters.ville === ville || (ville === 'Tous' && !filters.ville)) && (
                                                            <div className="w-2 h-2 rounded-full bg-accent" />
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
                                        <label className="block text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">Type de contrat</label>
                                        <div className="flex flex-wrap gap-2">
                                            {['Tous', ...filterData.types_contrat].map((contrat) => (
                                                <button
                                                    key={contrat}
                                                    onClick={() => setFilters((prev) => ({ ...prev, type_contrat: contrat === 'Tous' ? '' : contrat }))}
                                                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                                                        filters.type_contrat === contrat || (contrat === 'Tous' && !filters.type_contrat)
                                                            ? 'bg-accent text-white font-medium'
                                                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                                                    }`}
                                                >
                                                    {contrat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">
                                            Salaire (MAD)
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Min"
                                                value={filters.salaireMin}
                                                onChange={(event) => setFilters((prev) => ({ ...prev, salaireMin: event.target.value }))}
                                                className="w-full rounded-xl border border-borderGlass bg-obsidian/60 px-3 py-2.5 text-sm text-white focus:border-accent/60 focus:outline-none"
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Max"
                                                value={filters.salaireMax}
                                                onChange={(event) => setFilters((prev) => ({ ...prev, salaireMax: event.target.value }))}
                                                className="w-full rounded-xl border border-borderGlass bg-obsidian/60 px-3 py-2.5 text-sm text-white focus:border-accent/60 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </aside>

                <main className="w-full md:w-3/4">
                    <div className="bg-surface backdrop-blur-xl border border-borderGlass rounded-full p-2 mb-8 flex items-center shadow-lg">
                        <div className="pl-6 w-full flex items-center">
                            <Search className="text-white/40 mr-3" />
                            <input
                                type="text"
                                placeholder="Rechercher un metier, une competence..."
                                className="w-full bg-transparent border-none text-white focus:outline-none placeholder-white/40"
                                value={filters.search}
                                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-200">
                            {error}
                        </div>
                    )}

                    <motion.div
                        key={JSON.stringify(filters)}
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                    >
                        {loading && Array.from({ length: 6 }, (_, index) => (
                            <JobSkeletonCard key={index} index={index} />
                        ))}

                        {!loading && offres.length > 0 && offres.map((job) => (
                            <JobCard key={job.id} job={job} />
                        ))}

                        {!loading && offres.length === 0 && !error && (
                            <div className="col-span-full py-20 text-center bg-surface border border-borderGlass rounded-3xl">
                                <p className="text-xl text-white/60">Aucune offre ne correspond a vos criteres.</p>
                                <button
                                    onClick={resetFilters}
                                    className="mt-4 px-6 py-2 bg-white/5 hover:bg-white/10 rounded-full text-accent transition-colors"
                                >
                                    Reinitialiser les filtres
                                </button>
                            </div>
                        )}
                    </motion.div>
                </main>
            </div>

            <Footer />
        </motion.div>
    );
}
