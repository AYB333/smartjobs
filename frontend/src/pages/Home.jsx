import { useMemo, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ArrowDown, ArrowRight, Clock3, MapPin, Search, Sparkles, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import MagneticButton from '../components/MagneticButton';
import JobCard from '../components/JobCard';
import TextReveal from '../components/TextReveal';
import api from '../api/axios';
import { useI18n } from '../context/useAppExperience';

const bgImages = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2000&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=2000&q=80',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2000&q=80',
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

function buildJobsPath(params = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        const normalized = String(value ?? '').trim();
        if (normalized) {
            searchParams.set(key, normalized);
        }
    });

    const query = searchParams.toString();
    return query ? `/jobs?${query}` : '/jobs';
}

function HomeSkeletonCard({ index }) {
    return (
        <div
            key={`skeleton-${index}`}
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

export default function Home() {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [currentBg, setCurrentBg] = useState(0);
    const [featuredOffers, setFeaturedOffers] = useState([]);
    const [offersLoading, setOffersLoading] = useState(true);
    const [offersError, setOffersError] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [searchLocation, setSearchLocation] = useState('');
    const { scrollY } = useScroll();
    const yParallax = useTransform(scrollY, [0, 1000], [0, 300]);
    const topOffer = featuredOffers[0] ?? null;
    const secondaryOffers = featuredOffers.slice(1);
    const featuredStats = useMemo(() => {
        const cityCount = new Set(featuredOffers.map((offer) => offer?.ville).filter(Boolean)).size;
        const salaries = featuredOffers
            .map((offer) => Number(offer?.salaire))
            .filter((salary) => Number.isFinite(salary));
        const averageSalary = salaries.length
            ? Math.round(salaries.reduce((total, salary) => total + salary, 0) / salaries.length)
            : 0;

        return [
            { label: t('home.featured.opportunities'), value: featuredOffers.length || '-', icon: Sparkles },
            { label: t('home.featured.cities'), value: cityCount || '-', icon: MapPin },
            { label: t('home.featured.averageSalary'), value: averageSalary ? `${averageSalary.toLocaleString('fr-FR')} MAD` : '-', icon: TrendingUp },
        ];
    }, [featuredOffers, t]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentBg((prev) => (prev + 1) % bgImages.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchFeaturedOffers = async () => {
            setOffersLoading(true);
            setOffersError('');

            try {
                const response = await api.get('/offres', { params: { limit: 6 } });
                const offers = extractOffers(response?.data).slice(0, 6);
                setFeaturedOffers(offers);
            } catch {
                setOffersError("Impossible de charger les offres a la une.");
            } finally {
                setOffersLoading(false);
            }
        };

        fetchFeaturedOffers();
    }, []);

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        navigate(buildJobsPath({ search: searchKeyword, ville: searchLocation }));
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="home-landing min-h-screen bg-obsidian"
        >
            <Navbar />

            <section className="force-dark relative flex min-h-[760px] items-center justify-center overflow-hidden py-32 sm:min-h-screen sm:py-36 lg:py-40">
                <motion.div style={{ y: yParallax }} className="pointer-events-none absolute inset-0 z-0">
                    <AnimatePresence mode="popLayout">
                        <motion.img
                            key={currentBg}
                            src={bgImages[currentBg]}
                            initial={{ opacity: 0, scale: 1.05 }}
                            animate={{ opacity: 0.4, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.5, ease: 'easeInOut' }}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                        />
                    </AnimatePresence>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-hero mix-blend-multiply" />
                    <div className="pointer-events-none absolute inset-0 bg-[rgba(7,17,32,0.72)]" />
                </motion.div>

                <div className="relative z-20 container mx-auto px-6 text-center flex flex-col items-center">
                    <div className="mb-8 flex max-w-3xl flex-wrap justify-center gap-2 opacity-0 animate-[fadeIn_1s_ease-out_0.35s_forwards]">
                        {['Serveur', 'Cuisinier', 'Barista', 'Receptionniste', 'Chef de rang', 'Gerant'].map((tag) => (
                            <Link
                                key={tag}
                                to={buildJobsPath({ search: tag })}
                                className="rounded-full border border-borderGlass bg-surface px-4 py-2 text-xs font-semibold text-white/80 shadow-[0_0_15px_rgba(232,101,26,0.1)] backdrop-blur-md transition-colors hover:border-accent/50 hover:text-white sm:text-sm"
                            >
                                {tag}
                            </Link>
                        ))}
                    </div>

                    <TextReveal
                        text={t('home.hero.title')}
                        className="max-w-5xl justify-center text-balance text-4xl font-black leading-tight tracking-tight drop-shadow-2xl md:text-6xl lg:text-7xl"
                    />
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.8 }}
                        className="mx-auto mb-10 mt-6 max-w-2xl text-lg font-light text-white/75 md:mb-12 md:text-2xl"
                    >
                        {t('home.hero.subtitle')}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.92, duration: 0.7 }}
                        className="mb-8 flex w-full max-w-xl flex-col justify-center gap-3 sm:flex-row"
                    >
                        <Link
                            to="/jobs"
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-white shadow-[0_0_22px_rgba(232,101,26,0.35)] transition-colors hover:bg-accent/90"
                        >
                            {t('home.hero.cta.jobs')}
                            <ArrowRight size={16} />
                        </Link>
                        <Link
                            to="/auth?role=recruteur&mode=register"
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-borderGlass bg-surface px-6 py-3 text-sm font-bold text-white/90 transition-colors hover:border-accent/50 hover:text-white"
                        >
                            {t('home.hero.cta.recruiter')}
                            <ArrowRight size={16} />
                        </Link>
                    </motion.div>

                    <motion.form
                        onSubmit={handleSearchSubmit}
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 1, type: 'spring' }}
                        className="w-full max-w-3xl rounded-3xl border border-borderGlass bg-surface p-3 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-2xl md:flex md:rounded-full"
                    >
                        <div className="flex min-w-0 flex-1 items-center px-4 py-3 md:px-6 md:py-0">
                            <Search className="mr-3 shrink-0 text-white/45" />
                            <input
                                type="text"
                                placeholder={t('home.search.keyword')}
                                value={searchKeyword}
                                onChange={(event) => setSearchKeyword(event.target.value)}
                                className="w-full bg-transparent border-none text-white focus:outline-none placeholder-white/40"
                            />
                        </div>
                        <div className="w-px h-8 bg-borderGlass hidden md:block self-center" />
                        <div className="flex min-w-0 flex-1 items-center px-4 py-3 md:px-6 md:py-0">
                            <MapPin className="mr-3 shrink-0 text-white/45" />
                            <input
                                type="text"
                                placeholder={t('home.search.location')}
                                value={searchLocation}
                                onChange={(event) => setSearchLocation(event.target.value)}
                                className="w-full bg-transparent border-none text-white focus:outline-none placeholder-white/40"
                            />
                        </div>
                        <div className="block w-full md:w-auto">
                            <MagneticButton type="submit" className="w-full rounded-full bg-accent px-8 py-3.5 font-bold text-white shadow-[0_0_20px_rgba(232,101,26,0.4)] transition-colors hover:bg-accent/90 md:w-auto">
                                {t('home.search.cta')}
                            </MagneticButton>
                        </div>
                    </motion.form>
                </div>

                <div className="absolute bottom-10 z-20 text-white/50 flex flex-col items-center gap-2">
                    <span className="text-sm uppercase tracking-widest font-medium">{t('home.discover')}</span>
                    <ArrowDown size={20} className="animate-bounce" />
                </div>
            </section>

            <section className="home-highlights-band relative z-30 border-y border-borderGlass bg-deepNavy/80 backdrop-blur-xl">
                <div className="container mx-auto grid gap-4 px-6 py-10 text-center md:grid-cols-3">
                    <div className="home-feature-box rounded-2xl border border-borderGlass bg-white/5 px-5 py-5">
                        <span className="home-feature-heading text-sm font-bold uppercase tracking-wider text-white">{t('home.stats.offers')}</span>
                        <p className="mt-2 text-sm leading-relaxed text-white/60">Des opportunites recentrees sur l'hotellerie, la restauration et le service.</p>
                    </div>
                    <div className="home-feature-box rounded-2xl border border-borderGlass bg-white/5 px-5 py-5">
                        <span className="home-feature-heading text-sm font-bold uppercase tracking-wider text-white">{t('home.stats.establishments')}</span>
                        <p className="mt-2 text-sm leading-relaxed text-white/60">CV, experience et objectifs visibles dans un parcours candidat guide.</p>
                    </div>
                    <div className="home-feature-box rounded-2xl border border-borderGlass bg-white/5 px-5 py-5">
                        <span className="home-feature-heading text-sm font-bold uppercase tracking-wider text-white">{t('home.stats.candidates')}</span>
                        <p className="mt-2 text-sm leading-relaxed text-white/60">Quiz de preselection pour aider les recruteurs a qualifier plus vite.</p>
                    </div>
                </div>
            </section>

            <section className="home-jobs-section py-24 container mx-auto px-6">
                <div>
                    <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                                <Clock3 size={13} />
                                {t('home.featured.live')}
                            </p>
                            <TextReveal text={t('home.featured.title')} className="text-4xl md:text-5xl font-bold mb-4" />
                            <p className="max-w-2xl text-white/55 text-lg">
                                {t('home.featured.subtitle')}
                            </p>
                        </div>

                        <Link
                            to="/jobs"
                            className="inline-flex w-fit items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/85 hover:border-accent/50 hover:text-white transition-colors"
                        >
                            {t('home.featured.explore')}
                            <ArrowRight size={15} />
                        </Link>
                    </div>

                    {offersError && (
                        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-200">
                            {offersError}
                        </div>
                    )}

                    {!offersLoading && featuredOffers.length > 0 && (
                        <div className="mb-6 grid gap-3 md:grid-cols-3">
                            {featuredStats.map((stat) => {
                                const Icon = stat.icon;
                                return (
                                    <div key={stat.label} className="home-featured-stat rounded-2xl border border-borderGlass bg-surface px-4 py-3">
                                        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-white/45">
                                            <Icon size={13} className="text-accent" />
                                            {stat.label}
                                        </p>
                                        <p className="mt-1 text-lg font-bold text-white">{stat.value}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {offersLoading && Array.from({ length: 6 }, (_, index) => (
                            <HomeSkeletonCard key={index} index={index} />
                        ))}

                        {!offersLoading && topOffer && (
                            <div className="md:col-span-2 lg:col-span-1">
                                <JobCard job={topOffer} />
                            </div>
                        )}

                        {!offersLoading && secondaryOffers.map((job) => (
                            <JobCard key={job.id} job={job} />
                        ))}
                    </div>

                    {!offersLoading && featuredOffers.length === 0 && !offersError && (
                            <div className="rounded-3xl border border-borderGlass bg-surface px-6 py-16 text-center">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                                    <Search className="h-8 w-8 text-white/30" />
                                </div>
                                <h3 className="mb-2 text-xl font-semibold text-white">Aucune offre active pour le moment</h3>
                                <p className="mb-6 text-white/50">
                                    Ajoutez le seed demo ou creez une offre recruteur pour alimenter cette vitrine.
                                </p>
                                <Link
                                    to="/jobs"
                                    className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
                                >
                                    Parcourir les offres
                                </Link>
                            </div>
                    )}
                </div>
            </section>

            <Footer />
        </motion.div>
    );
}
