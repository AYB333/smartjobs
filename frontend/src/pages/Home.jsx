import { useMemo, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ArrowDown, ArrowRight, Clock3, MapPin, Search, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import MagneticButton from '../components/MagneticButton';
import AnimatedCounter from '../components/AnimatedCounter';
import JobCard from '../components/JobCard';
import TextReveal from '../components/TextReveal';
import api from '../api/axios';

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
    const [currentBg, setCurrentBg] = useState(0);
    const [featuredOffers, setFeaturedOffers] = useState([]);
    const [offersLoading, setOffersLoading] = useState(true);
    const [offersError, setOffersError] = useState('');
    const { scrollY } = useScroll();
    const yParallax = useTransform(scrollY, [0, 1000], [0, 300]);
    const topOffer = featuredOffers[0] ?? null;
    const secondaryOffers = featuredOffers.slice(1);
    const featuredStats = useMemo(() => {
        const cityCount = new Set(featuredOffers.map((offer) => offer?.ville).filter(Boolean)).size;
        const withSalary = featuredOffers.filter((offer) => offer?.salaire !== null && offer?.salaire !== undefined && offer?.salaire !== '');
        const averageSalary = withSalary.length
            ? Math.round(withSalary.reduce((total, offer) => total + Number(offer.salaire), 0) / withSalary.length)
            : 0;

        return [
            { label: 'Opportunites', value: featuredOffers.length || '-', icon: Sparkles },
            { label: 'Villes', value: cityCount || '-', icon: MapPin },
            { label: 'Salaire moyen', value: averageSalary ? `${averageSalary.toLocaleString('fr-FR')} MAD` : '-', icon: TrendingUp },
        ];
    }, [featuredOffers]);

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

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen bg-obsidian"
        >
            <Navbar />

            <section className="relative h-screen flex items-center justify-center overflow-hidden">
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
                    <div className="pointer-events-none absolute inset-0 bg-deepNavy/60" />
                </motion.div>

                <div className="absolute top-[20%] w-full flex justify-center flex-wrap gap-3 z-10 opacity-0 animate-[fadeIn_1s_ease-out_1s_forwards] pointer-events-none px-4">
                    {['Serveur', 'Cuisinier', 'Barista', 'Receptionniste', 'Chef de rang', 'Gerant'].map((tag) => (
                        <div key={tag} className="px-5 py-2.5 rounded-full bg-surface backdrop-blur-md border border-borderGlass text-white/80 font-medium text-sm shadow-[0_0_15px_rgba(232,101,26,0.1)]">
                            {tag}
                        </div>
                    ))}
                </div>

                <div className="relative z-20 container mx-auto px-6 text-center flex flex-col items-center">
                    <TextReveal
                        text="Trouvez votre place dans le secteur CHR"
                        className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight mb-6 justify-center drop-shadow-2xl"
                    />
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.8 }}
                        className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto mb-12 font-light"
                    >
                        L'excellence de la restauration et de l'hotellerie merite les meilleurs talents.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 1, type: 'spring' }}
                        className="w-full max-w-3xl flex flex-col md:flex-row gap-4 p-3 bg-surface backdrop-blur-2xl border border-borderGlass rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                    >
                        <div className="flex-1 flex items-center px-6">
                            <Search className="text-white/40 mr-3" />
                            <input
                                type="text"
                                placeholder="Metier, etablissement, mot cle..."
                                className="w-full bg-transparent border-none text-white focus:outline-none placeholder-white/40"
                            />
                        </div>
                        <div className="w-px h-8 bg-borderGlass hidden md:block self-center" />
                        <div className="flex-1 flex items-center px-6">
                            <MapPin className="text-white/40 mr-3" />
                            <input
                                type="text"
                                placeholder="Ville ou region"
                                className="w-full bg-transparent border-none text-white focus:outline-none placeholder-white/40"
                            />
                        </div>
                        <Link to="/jobs">
                            <MagneticButton className="px-8 py-3.5 bg-accent hover:bg-accent/90 text-white rounded-full font-bold shadow-[0_0_20px_rgba(232,101,26,0.4)] transition-colors">
                                Rechercher
                            </MagneticButton>
                        </Link>
                    </motion.div>
                </div>

                <div className="absolute bottom-10 z-20 text-white/50 flex flex-col items-center gap-2">
                    <span className="text-sm uppercase tracking-widest font-medium">Decouvrir</span>
                    <ArrowDown size={20} className="animate-bounce" />
                </div>
            </section>

            <section className="relative z-30 border-y border-borderGlass bg-deepNavy/80 backdrop-blur-xl">
                <div className="container mx-auto px-6 py-10 flex flex-wrap justify-around text-center gap-8">
                    <div className="flex flex-col items-center">
                        <span className="text-4xl md:text-5xl font-black text-white relative">
                            +<AnimatedCounter value={2500} />
                            <span className="absolute -bottom-2 left-0 w-full h-1 bg-accent rounded-full"></span>
                        </span>
                        <span className="mt-4 text-white/60 font-medium tracking-wide uppercase text-sm">Offres Actives</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-4xl md:text-5xl font-black text-white relative">
                            +<AnimatedCounter value={850} />
                            <span className="absolute -bottom-2 left-0 w-full h-1 bg-accent rounded-full"></span>
                        </span>
                        <span className="mt-4 text-white/60 font-medium tracking-wide uppercase text-sm">Etablissements</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-4xl md:text-5xl font-black text-white relative">
                            +<AnimatedCounter value={12000} />
                            <span className="absolute -bottom-2 left-0 w-full h-1 bg-accent rounded-full"></span>
                        </span>
                        <span className="mt-4 text-white/60 font-medium tracking-wide uppercase text-sm">Candidats</span>
                    </div>
                </div>
            </section>

            <section className="py-24 container mx-auto px-6">
                <div>
                    <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                                <Clock3 size={13} />
                                Marche CHR en direct
                            </p>
                            <TextReveal text="Offres a la une" className="text-4xl md:text-5xl font-bold mb-4" />
                            <p className="max-w-2xl text-white/55 text-lg">
                                Selection d'opportunites actives, recentes et pretes a recevoir des candidatures.
                            </p>
                        </div>

                        <Link
                            to="/jobs"
                            className="inline-flex w-fit items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/85 hover:border-accent/50 hover:text-white transition-colors"
                        >
                            Tout explorer
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
                                    <div key={stat.label} className="rounded-2xl border border-borderGlass bg-surface px-4 py-3">
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
