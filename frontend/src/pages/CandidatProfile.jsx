import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    CheckCircle2,
    FileText,
    UploadCloud,
    UserRound,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const cities = ['Casablanca', 'Rabat', 'Marrakech', 'Agadir', 'Fès', 'Tanger', 'Meknès', 'Oujda', 'Tétouan', 'El Jadida'];
const experienceOptions = ['Sans expérience', 'Moins de 1 an', '1 à 2 ans', '3 à 5 ans', 'Plus de 5 ans'];
const positionOptions = ['Serveur', 'Cuisinier', 'Réceptionniste', 'Femme de chambre', 'Plongeur', 'Barman', 'Barista', 'Chef de rang', 'Commis de cuisine', 'Gérant'];
const availabilityOptions = ['Immediate', 'Sous 1 semaine', 'Sous 2 semaines', 'Sous 1 mois'];
const contractOptions = ['CDI', 'CDD', 'Extra', 'Saisonnier'];

function getBackendBaseUrl() {
    const base = api?.defaults?.baseURL || '';
    return base.replace(/\/api\/?$/, '');
}

function withCurrentValue(options, value) {
    const normalizedValue = String(value || '').trim();
    if (!normalizedValue || options.some((option) => option.toLowerCase() === normalizedValue.toLowerCase())) {
        return options;
    }

    return [normalizedValue, ...options];
}

function isPdf(file) {
    return file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf');
}

function isValidImage(file) {
    return ['image/jpeg', 'image/jpg', 'image/png'].includes(file?.type);
}

function buildStorageUrl(baseUrl, path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const cleanPath = String(path).replace(/^\/+/, '');
    if (cleanPath.startsWith('storage/')) {
        return `${baseUrl}/${cleanPath}`;
    }
    return `${baseUrl}/storage/${cleanPath}`;
}

function getCandidateProfile(user) {
    const profile = user?.candidatProfile
        ?? user?.candidat_profile
        ?? user?.profile
        ?? {};

    return {
        ...profile,
        cv_path: profile?.cv_path ?? profile?.cvPath ?? '',
        cv_url: profile?.cv_url ?? profile?.cvUrl ?? '',
        photo_path: profile?.photo_path ?? profile?.photoPath ?? '',
        photo_url: profile?.photo_url ?? profile?.photoUrl ?? '',
        disponibilite: profile?.disponibilite ?? '',
        contrat_prefere: profile?.contrat_prefere ?? profile?.contratPrefere ?? '',
    };
}

function normalizeCandidateUser(user) {
    if (!user) return null;

    const profile = getCandidateProfile(user);

    return {
        ...user,
        profile,
        candidatProfile: profile,
        candidat_profile: profile,
    };
}

function profileFileUrl(baseUrl, profile, pathKey, urlKey) {
    return buildStorageUrl(baseUrl, profile?.[urlKey] || profile?.[pathKey]);
}

function hasProfileFile(profile, pathKey, urlKey) {
    return Boolean(profile?.[pathKey] || profile?.[urlKey]);
}

function completionItems(form, currentProfile, cvFile, photoFile) {
    return [
        { label: 'Ville', done: Boolean(form.ville.trim()) },
        { label: 'Expérience', done: Boolean(form.experience.trim()) },
        { label: 'Poste recherché', done: Boolean(form.poste_recherche.trim()) },
        { label: 'Disponibilité', done: Boolean(form.disponibilite.trim()) },
        { label: 'Contrat préféré', done: Boolean(form.contrat_prefere.trim()) },
        { label: 'CV PDF', done: Boolean(cvFile || hasProfileFile(currentProfile, 'cv_path', 'cv_url')) },
        { label: 'Photo', done: Boolean(photoFile || hasProfileFile(currentProfile, 'photo_path', 'photo_url')), optional: true },
    ];
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
                {options.map((option) => (
                    <option key={option} value={option} className="bg-deepNavy text-white">
                        {option}
                    </option>
                ))}
            </select>
        </label>
    );
}

function UploadBox({ title, description, status, accept, onFile, onDrop, children }) {
    return (
        <label
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            className="block cursor-pointer rounded-2xl border border-dashed border-borderGlass bg-obsidian/40 p-4 transition-all hover:border-accent/45 hover:bg-obsidian/55"
        >
            <input
                type="file"
                accept={accept}
                className="hidden"
                onChange={(event) => onFile(event.target.files?.[0])}
            />
            <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <UploadCloud size={18} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{title}</p>
                    <p className="mt-1 text-sm text-white/55">{description}</p>
                    {status && <p className="mt-2 text-xs font-semibold text-accent">{status}</p>}
                    {children}
                </div>
            </div>
        </label>
    );
}

export default function CandidatProfile() {
    const backendBase = useMemo(() => getBackendBaseUrl(), []);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [form, setForm] = useState({
        ville: '',
        experience: '',
        poste_recherche: '',
        disponibilite: '',
        contrat_prefere: '',
    });
    const [cvFile, setCvFile] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState('');

    const currentProfile = getCandidateProfile(currentUser);
    const items = completionItems(form, currentProfile, cvFile, photoFile);
    const completedCount = items.filter((item) => item.done).length;
    const completion = Math.round((completedCount / items.length) * 100);
    const currentCvUrl = profileFileUrl(backendBase, currentProfile, 'cv_path', 'cv_url');
    const currentPhotoUrl = photoPreview || profileFileUrl(backendBase, currentProfile, 'photo_path', 'photo_url');
    const hasCoreProfile = Boolean(form.ville.trim() && form.experience.trim() && form.poste_recherche.trim());
    const hasProfessionalPreferences = Boolean(form.disponibilite.trim() && form.contrat_prefere.trim());
    const hasSavedCv = hasProfileFile(currentProfile, 'cv_path', 'cv_url');
    const hasSavedPhoto = hasProfileFile(currentProfile, 'photo_path', 'photo_url');
    const hasCvReady = Boolean(cvFile || hasSavedCv);
    const canSeeRecommendations = Boolean(form.ville.trim() && form.poste_recherche.trim());
    const recommendedJobsUrl = `/jobs?ville=${encodeURIComponent(form.ville)}&search=${encodeURIComponent(form.poste_recherche)}&type_contrat=${encodeURIComponent(form.contrat_prefere)}`;
    const cityOptions = withCurrentValue(cities, form.ville);
    const mappedExperienceOptions = withCurrentValue(experienceOptions, form.experience);
    const mappedPositionOptions = withCurrentValue(positionOptions, form.poste_recherche);

    const nextAction = useMemo(() => {
        if (!hasCoreProfile) {
            return 'Complétez vos informations';
        }

        if (!hasProfessionalPreferences) {
            return 'Ajoutez vos préférences';
        }

        if (!hasCvReady) {
            return 'Ajoutez votre CV';
        }

        return 'Profil prêt pour postuler';
    }, [hasCoreProfile, hasCvReady, hasProfessionalPreferences]);

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await api.get('/auth/me');
                const user = normalizeCandidateUser(response?.data?.user);
                const profile = getCandidateProfile(user);
                setCurrentUser(user);
                setForm({
                    ville: profile?.ville || '',
                    experience: profile?.experience || '',
                    poste_recherche: profile?.poste_recherche || '',
                    disponibilite: profile?.disponibilite || '',
                    contrat_prefere: profile?.contrat_prefere || '',
                });
                if (user) {
                    localStorage.setItem('user', JSON.stringify(user));
                }
            } catch (requestError) {
                setError(requestError?.response?.data?.message || 'Impossible de charger le profil.');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    useEffect(() => {
        return () => {
            if (photoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(photoPreview);
            }
        };
    }, [photoPreview]);

    const setField = (field, value) => {
        setForm((previous) => ({ ...previous, [field]: value }));
    };

    const handleCvSelection = (file) => {
        if (!file) return;
        if (!isPdf(file)) {
            setError('Le CV doit être un PDF.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError('Le CV dépasse 2MB.');
            return;
        }
        setError('');
        setCvFile(file);
    };

    const handlePhotoSelection = (file) => {
        if (!file) return;
        if (!isValidImage(file)) {
            setError('La photo doit être en JPEG ou PNG.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError('La photo dépasse 2MB.');
            return;
        }
        setError('');
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const saveProfile = async (event) => {
        event.preventDefault();
        setError('');

        if (!form.ville.trim()) {
            setError('La ville est requise.');
            return;
        }
        if (!form.experience.trim()) {
            setError("L'expérience est requise.");
            return;
        }
        if (!form.poste_recherche.trim()) {
            setError('Le poste recherché est requis.');
            return;
        }
        if (!form.disponibilite.trim()) {
            setError('La disponibilité est requise.');
            return;
        }
        if (!form.contrat_prefere.trim()) {
            setError('Le contrat préféré est requis.');
            return;
        }

        setSaving(true);

        const payload = new FormData();
        payload.append('ville', form.ville);
        payload.append('experience', form.experience);
        payload.append('poste_recherche', form.poste_recherche);
        payload.append('disponibilite', form.disponibilite);
        payload.append('contrat_prefere', form.contrat_prefere);
        if (cvFile) payload.append('cv', cvFile);
        if (photoFile) payload.append('photo', photoFile);
        payload.append('_method', 'PATCH');

        try {
            const response = await api.post('/auth/me', payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const user = normalizeCandidateUser(response?.data?.user);
            const profile = getCandidateProfile(user);
            setCurrentUser(user);
            setForm({
                ville: profile?.ville || form.ville,
                experience: profile?.experience || form.experience,
                poste_recherche: profile?.poste_recherche || form.poste_recherche,
                disponibilite: profile?.disponibilite || form.disponibilite,
                contrat_prefere: profile?.contrat_prefere || form.contrat_prefere,
            });
            if (user) {
                localStorage.setItem('user', JSON.stringify(user));
            }
            setCvFile(null);
            setPhotoFile(null);
            setPhotoPreview('');
            setToast('Profil mis à jour avec succès.');
            setTimeout(() => setToast(''), 2500);
        } catch (requestError) {
            setError(requestError?.response?.data?.message || 'Erreur lors de la sauvegarde du profil.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-obsidian">
            <Navbar />

            <main className="container mx-auto px-5 pt-28 pb-14 sm:px-6 lg:pt-32">
                <section className="mb-7 max-w-4xl">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent">Profil candidat</p>
                    <h1 className="text-3xl font-black leading-tight text-white md:text-4xl">Préparez votre profil pour postuler</h1>
                    <p className="mt-3 max-w-3xl text-base leading-relaxed text-white/62">
                        Complétez vos informations professionnelles et ajoutez votre CV une seule fois. SmartJobs utilisera ce profil pour vos candidatures et vos recommandations.
                    </p>
                </section>

                {error && (
                    <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm font-medium text-rose-200">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="rounded-3xl border border-borderGlass bg-surface px-6 py-16 text-center">
                        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                        <p className="text-white/60">Chargement du profil...</p>
                    </div>
                ) : (
                    <form onSubmit={saveProfile} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
                        <section className="space-y-6">
                            <div className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_50px_rgba(0,0,0,0.12)] md:p-7">
                                <div className="mb-6 border-b border-borderGlass pb-5">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-accent">Étape 1</p>
                                    <h2 className="mt-1 text-xl font-bold text-white">Informations professionnelles</h2>
                                    <p className="mt-1 text-sm text-white/58">Ces champs aident à trouver des offres cohérentes avec votre profil.</p>
                                </div>

                                <div className="grid gap-5 md:grid-cols-2">
                                    <SelectField
                                        label="Ville"
                                        value={form.ville}
                                        onChange={(value) => setField('ville', value)}
                                        options={cityOptions}
                                        placeholder="Choisir une ville"
                                    />
                                    <SelectField
                                        label="Expérience"
                                        value={form.experience}
                                        onChange={(value) => setField('experience', value)}
                                        options={mappedExperienceOptions}
                                        placeholder="Choisir une expérience"
                                    />
                                    <div className="md:col-span-2">
                                        <SelectField
                                            label="Poste recherché"
                                            value={form.poste_recherche}
                                            onChange={(value) => setField('poste_recherche', value)}
                                            options={mappedPositionOptions}
                                            placeholder="Choisir un poste"
                                        />
                                    </div>
                                    <SelectField
                                        label="Disponibilité"
                                        value={form.disponibilite}
                                        onChange={(value) => setField('disponibilite', value)}
                                        options={availabilityOptions}
                                        placeholder="Choisir une disponibilité"
                                    />
                                    <SelectField
                                        label="Contrat préféré"
                                        value={form.contrat_prefere}
                                        onChange={(value) => setField('contrat_prefere', value)}
                                        options={contractOptions}
                                        placeholder="Choisir un contrat"
                                    />
                                </div>
                            </div>

                            <div className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_50px_rgba(0,0,0,0.12)] md:p-7">
                                <div className="mb-6 border-b border-borderGlass pb-5">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-accent">Étape 2</p>
                                    <h2 className="mt-1 text-xl font-bold text-white">Documents</h2>
                                    <p className="mt-1 text-sm text-white/58">Le CV est requis pour postuler. La photo reste optionnelle.</p>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <UploadBox
                                        title={cvFile ? cvFile.name : hasSavedCv ? 'CV ajouté' : 'Ajouter mon CV PDF'}
                                        description="PDF max 2MB."
                                        status="Ce CV sera réutilisé automatiquement pour vos postulations."
                                        accept="application/pdf,.pdf"
                                        onFile={handleCvSelection}
                                        onDrop={(event) => {
                                            event.preventDefault();
                                            handleCvSelection(event.dataTransfer.files?.[0]);
                                        }}
                                    >
                                        {currentCvUrl && (
                                            <a
                                                href={currentCvUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(event) => event.stopPropagation()}
                                                className="mt-3 inline-flex items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:border-accent/45 hover:text-white"
                                            >
                                                <FileText size={13} />
                                                Voir le CV actuel
                                            </a>
                                        )}
                                    </UploadBox>

                                    <UploadBox
                                        title={photoFile ? photoFile.name : hasSavedPhoto ? 'Photo ajoutée' : 'Ajouter une photo'}
                                        description="Ajoutez une photo professionnelle claire. Formats JPG/PNG, max 2MB."
                                        status={photoFile || hasSavedPhoto ? 'Remplacer la photo' : ''}
                                        accept="image/jpeg,image/png"
                                        onFile={handlePhotoSelection}
                                        onDrop={(event) => {
                                            event.preventDefault();
                                            handlePhotoSelection(event.dataTransfer.files?.[0]);
                                        }}
                                    >
                                        {currentPhotoUrl && (
                                            <img
                                                src={currentPhotoUrl}
                                                alt="Aperçu photo profil"
                                                className="hidden"
                                            />
                                        )}
                                    </UploadBox>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(232,101,26,0.22)] transition-colors hover:bg-accent/90 disabled:opacity-70"
                                >
                                    {saving ? 'Enregistrement...' : 'Enregistrer mon profil'}
                                </button>
                                {canSeeRecommendations && (
                                    <Link
                                        to={recommendedJobsUrl}
                                        className="inline-flex items-center justify-center gap-2 rounded-full border border-borderGlass bg-surface px-6 py-3 text-sm font-semibold text-white/80 transition-colors hover:border-accent/50 hover:text-white"
                                    >
                                        Voir les offres recommandées
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
                                    {items.map((item) => (
                                        <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-borderGlass bg-white/5 px-3 py-2.5">
                                            <span className="text-sm font-medium text-white/74">
                                                {item.label}{item.optional ? ' (optionnel)' : ''}
                                            </span>
                                            <CheckCircle2 size={16} className={item.done ? 'text-emerald-300' : 'text-white/30'} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-3xl border border-borderGlass bg-surface p-5 shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
                                <p className="text-xs font-semibold uppercase tracking-wider text-accent">Aperçu recruteur</p>
                                <div className="mt-5 flex items-center gap-4">
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-borderGlass bg-white/5">
                                        {currentPhotoUrl ? (
                                            <img src={currentPhotoUrl} alt="Photo candidat" className="h-full w-full object-cover" />
                                        ) : (
                                            <UserRound size={25} className="text-accent" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-lg font-bold text-white">{currentUser?.name || 'Candidat SmartJobs'}</p>
                                        <p className="mt-1 truncate text-sm text-white/58">{form.poste_recherche || 'Poste recherché non renseigné'}</p>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3 text-sm">
                                    <div className="flex items-center justify-between gap-3 border-b border-borderGlass pb-3">
                                        <span className="text-white/50">Ville</span>
                                        <span className="text-right font-semibold text-white">{form.ville || 'Non renseignée'}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 border-b border-borderGlass pb-3">
                                        <span className="text-white/50">Expérience</span>
                                        <span className="text-right font-semibold text-white">{form.experience || 'Non renseignée'}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 border-b border-borderGlass pb-3">
                                        <span className="text-white/50">Disponibilité</span>
                                        <span className="text-right font-semibold text-white">{form.disponibilite || 'Non renseignée'}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 border-b border-borderGlass pb-3">
                                        <span className="text-white/50">Contrat préféré</span>
                                        <span className="text-right font-semibold text-white">{form.contrat_prefere || 'Non renseigné'}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-white/50">CV</span>
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                            hasCvReady
                                                ? 'bg-emerald-500/12 text-emerald-200'
                                                : 'bg-amber-500/12 text-amber-200'
                                        }`}>
                                            <FileText size={13} />
                                            {hasCvReady ? 'Ajouté' : 'Manquant'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-borderGlass bg-white/5 p-4">
                                <p className="text-sm font-semibold text-white">
                                    Conseil
                                </p>
                                <p className="mt-2 text-xs leading-relaxed text-white/60">
                                    Un profil clair avec CV permet de postuler plus vite et donne aux recruteurs les informations essentielles sans formulaire répété.
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
