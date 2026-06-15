import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    Briefcase,
    Building2,
    CheckCircle2,
    MapPin,
    Save,
    Store,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0 },
};

const cities = ['Casablanca', 'Rabat', 'Marrakech', 'Agadir', 'Fes', 'Tanger', 'Meknes', 'Oujda', 'Tetouan', 'El Jadida'];

const establishmentTypes = [
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'cafe', label: 'Cafe' },
];

function getRecruiterProfile(user) {
    return user?.recruteurProfile
        ?? user?.recruteur_profile
        ?? user?.profile
        ?? {};
}

function normalizeRecruiterUser(user) {
    if (!user) return null;
    const profile = getRecruiterProfile(user);

    return {
        ...user,
        profile,
        recruteurProfile: profile,
        recruteur_profile: profile,
    };
}

function withCurrentValue(options, value) {
    const normalizedValue = String(value || '').trim();
    if (!normalizedValue || options.some((option) => option.toLowerCase() === normalizedValue.toLowerCase())) {
        return options;
    }

    return [normalizedValue, ...options];
}

function getInitials(value) {
    const initials = String(value || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    return initials || 'R';
}

function formatType(value) {
    return establishmentTypes.find((type) => type.value === value)?.label || value || 'Type non renseigne';
}

function SelectField({ label, value, onChange, options, placeholder }) {
    return (
        <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/55">{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-2xl border border-borderGlass bg-obsidian/60 px-4 py-3.5 text-sm font-medium text-white outline-none transition-all focus:border-accent/60 focus:bg-obsidian/70 focus:shadow-[0_0_0_4px_rgba(232,101,26,0.12)]"
            >
                <option value="">{placeholder}</option>
                {options.map((option) => {
                    const valueOption = typeof option === 'string' ? option : option.value;
                    const labelOption = typeof option === 'string' ? option : option.label;

                    return (
                        <option key={valueOption} value={valueOption} className="bg-deepNavy text-white">
                            {labelOption}
                        </option>
                    );
                })}
            </select>
        </label>
    );
}

function TextField({ label, value, onChange, placeholder }) {
    return (
        <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/55">{label}</span>
            <input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="w-full rounded-2xl border border-borderGlass bg-obsidian/60 px-4 py-3.5 text-sm font-medium text-white outline-none transition-all placeholder:text-white/30 focus:border-accent/60 focus:bg-obsidian/70 focus:shadow-[0_0_0_4px_rgba(232,101,26,0.12)]"
            />
        </label>
    );
}

function CompletionRow({ label, done }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-borderGlass bg-white/5 px-3 py-2.5">
            <span className="text-sm font-medium text-white/74">{label}</span>
            <CheckCircle2 size={16} className={done ? 'text-emerald-300' : 'text-white/30'} />
        </div>
    );
}

export default function RecruteurProfile() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [form, setForm] = useState({
        name: '',
        nom_etablissement: '',
        type_etablissement: '',
        ville: '',
    });

    const cityOptions = withCurrentValue(cities, form.ville);
    const initials = getInitials(form.nom_etablissement || form.name);
    const completionItems = useMemo(() => ([
        { label: 'Nom responsable', done: Boolean(form.name.trim()) },
        { label: 'Nom etablissement', done: Boolean(form.nom_etablissement.trim()) },
        { label: 'Type etablissement', done: Boolean(form.type_etablissement.trim()) },
        { label: 'Ville', done: Boolean(form.ville.trim()) },
    ]), [form.name, form.nom_etablissement, form.type_etablissement, form.ville]);
    const completion = Math.round((completionItems.filter((item) => item.done).length / completionItems.length) * 100);
    const nextAction = completion === 100 ? 'Profil recruteur pret' : 'Completez votre etablissement';
    const canCreateOffer = Boolean(form.nom_etablissement.trim() && form.type_etablissement && form.ville.trim());

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await api.get('/auth/me');
                const user = normalizeRecruiterUser(response?.data?.user);
                const profile = getRecruiterProfile(user);

                setCurrentUser(user);
                setForm({
                    name: user?.name || '',
                    nom_etablissement: profile?.nom_etablissement || '',
                    type_etablissement: profile?.type_etablissement || '',
                    ville: profile?.ville || '',
                });

                if (user) {
                    localStorage.setItem('user', JSON.stringify(user));
                }
            } catch (requestError) {
                setError(requestError?.response?.data?.message || 'Impossible de charger le profil recruteur.');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    const setField = (field, value) => {
        setForm((previous) => ({ ...previous, [field]: value }));
    };

    const saveProfile = async (event) => {
        event.preventDefault();
        setError('');

        if (!form.name.trim()) {
            setError('Le nom du responsable est requis.');
            return;
        }

        if (!form.nom_etablissement.trim()) {
            setError("Le nom de l'etablissement est requis.");
            return;
        }

        if (!form.type_etablissement) {
            setError("Le type d'etablissement est requis.");
            return;
        }

        if (!form.ville.trim()) {
            setError('La ville est requise.');
            return;
        }

        setSaving(true);

        try {
            const response = await api.patch('/auth/me', {
                name: form.name,
                nom_etablissement: form.nom_etablissement,
                type_etablissement: form.type_etablissement,
                ville: form.ville,
            });

            const user = normalizeRecruiterUser(response?.data?.user);
            const profile = getRecruiterProfile(user);
            setCurrentUser(user);
            setForm({
                name: user?.name || form.name,
                nom_etablissement: profile?.nom_etablissement || form.nom_etablissement,
                type_etablissement: profile?.type_etablissement || form.type_etablissement,
                ville: profile?.ville || form.ville,
            });

            if (user) {
                localStorage.setItem('user', JSON.stringify(user));
            }

            setToast('Profil recruteur mis a jour.');
            setTimeout(() => setToast(''), 2500);
        } catch (requestError) {
            setError(requestError?.response?.data?.message || 'Erreur lors de la sauvegarde du profil recruteur.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-obsidian">
            <Navbar />

            <main className="container mx-auto px-5 pt-28 pb-14 sm:px-6 lg:pt-32">
                <motion.section
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    className="mb-7 max-w-4xl"
                >
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent">Profil recruteur</p>
                    <h1 className="text-3xl font-black leading-tight text-white md:text-4xl">Configurez votre etablissement</h1>
                    <p className="mt-3 max-w-3xl text-base leading-relaxed text-white/62">
                        Ces informations donnent du contexte aux candidats et permettent d'afficher vos offres avec un etablissement clair.
                    </p>
                </motion.section>

                {error && (
                    <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm font-medium text-rose-200">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="rounded-3xl border border-borderGlass bg-surface px-6 py-16 text-center">
                        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                        <p className="text-white/60">Chargement du profil recruteur...</p>
                    </div>
                ) : (
                    <form onSubmit={saveProfile} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
                        <section className="space-y-6">
                            <motion.div
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_50px_rgba(0,0,0,0.12)] md:p-7"
                            >
                                <div className="mb-6 border-b border-borderGlass pb-5">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-accent">Identite</p>
                                    <h2 className="mt-1 text-xl font-bold text-white">Informations recruteur</h2>
                                    <p className="mt-1 text-sm text-white/58">
                                        Gardez ces informations simples: elles seront reutilisees dans vos offres et tableaux de bord.
                                    </p>
                                </div>

                                <div className="grid gap-5 md:grid-cols-2">
                                    <TextField
                                        label="Nom responsable"
                                        value={form.name}
                                        onChange={(value) => setField('name', value)}
                                        placeholder="Hassan Benali"
                                    />
                                    <TextField
                                        label="Nom etablissement"
                                        value={form.nom_etablissement}
                                        onChange={(value) => setField('nom_etablissement', value)}
                                        placeholder="Hotel Atlas"
                                    />
                                    <SelectField
                                        label="Type etablissement"
                                        value={form.type_etablissement}
                                        onChange={(value) => setField('type_etablissement', value)}
                                        options={establishmentTypes}
                                        placeholder="Choisir un type"
                                    />
                                    <SelectField
                                        label="Ville"
                                        value={form.ville}
                                        onChange={(value) => setField('ville', value)}
                                        options={cityOptions}
                                        placeholder="Choisir une ville"
                                    />
                                </div>
                            </motion.div>

                            <motion.div
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_50px_rgba(0,0,0,0.12)] md:p-7"
                            >
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Impact sur vos offres</p>
                                        <h2 className="mt-1 text-xl font-bold text-white">Profil utilise dans les cartes offres</h2>
                                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/58">
                                            Le type d'etablissement aide SmartJobs a afficher une image par defaut adaptee si vous ne joignez pas de photo a une offre.
                                        </p>
                                    </div>
                                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-4 py-2 text-sm font-semibold text-white/75">
                                        <Briefcase size={15} className="text-accent" />
                                        CHR
                                    </span>
                                </div>
                            </motion.div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(232,101,26,0.22)] transition-colors hover:bg-accent/90 disabled:opacity-70"
                                >
                                    <Save size={16} />
                                    {saving ? 'Enregistrement...' : 'Enregistrer mon profil'}
                                </button>
                                {canCreateOffer && (
                                    <Link
                                        to="/recruteur/offer/create"
                                        className="inline-flex items-center justify-center gap-2 rounded-full border border-borderGlass bg-surface px-6 py-3 text-sm font-semibold text-white/80 transition-colors hover:border-accent/50 hover:text-white"
                                    >
                                        Creer une offre
                                        <ArrowRight size={15} />
                                    </Link>
                                )}
                            </div>
                        </section>

                        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
                            <div className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Progression</p>
                                        <h3 className="mt-1 text-lg font-bold text-white">{nextAction}</h3>
                                    </div>
                                    <span className="text-2xl font-black text-white">{completion}%</span>
                                </div>
                                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${completion}%` }} />
                                </div>
                                <div className="mt-5 space-y-2">
                                    {completionItems.map((item) => (
                                        <CompletionRow key={item.label} label={item.label} done={item.done} />
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
                                <p className="text-xs font-semibold uppercase tracking-wider text-accent">Apercu public</p>
                                <div className="mt-5 flex items-center gap-4">
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-accent/25 bg-accent/12 text-xl font-black text-accent">
                                        {initials}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-lg font-bold text-white">
                                            {form.nom_etablissement || 'Etablissement SmartJobs'}
                                        </p>
                                        <p className="mt-1 truncate text-sm text-white/58">{formatType(form.type_etablissement)}</p>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3 text-sm">
                                    <div className="flex items-center justify-between gap-3 border-b border-borderGlass pb-3">
                                        <span className="inline-flex items-center gap-2 text-white/50">
                                            <MapPin size={14} />
                                            Ville
                                        </span>
                                        <span className="text-right font-semibold text-white">{form.ville || 'Non renseignee'}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 border-b border-borderGlass pb-3">
                                        <span className="inline-flex items-center gap-2 text-white/50">
                                            <Store size={14} />
                                            Type
                                        </span>
                                        <span className="text-right font-semibold text-white">{formatType(form.type_etablissement)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="inline-flex items-center gap-2 text-white/50">
                                            <Building2 size={14} />
                                            Responsable
                                        </span>
                                        <span className="text-right font-semibold text-white">{form.name || currentUser?.name || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-borderGlass bg-white/5 p-4">
                                <p className="text-sm font-semibold text-white">Conseil</p>
                                <p className="mt-2 text-xs leading-relaxed text-white/60">
                                    Un profil recruteur complet rend vos offres plus credibles et donne plus de confiance aux candidats.
                                </p>
                            </div>
                        </aside>
                    </form>
                )}
            </main>

            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="fixed right-5 top-24 z-[120] rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-emerald-100 shadow-lg"
                    >
                        <p className="inline-flex items-center gap-2 text-sm font-medium">
                            <CheckCircle2 size={15} />
                            {toast}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
