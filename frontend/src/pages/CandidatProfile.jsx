import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api/axios';

function getBackendBaseUrl() {
    const base = api?.defaults?.baseURL || '';
    return base.replace(/\/api\/?$/, '');
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

function isPdf(file) {
    return file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf');
}

function isValidImage(file) {
    return ['image/jpeg', 'image/jpg', 'image/png'].includes(file?.type);
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
    });
    const [cvFile, setCvFile] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState('');

    const currentProfile = currentUser?.candidatProfile ?? currentUser?.profile ?? {};
    const completion = profileCompletionPercent(currentUser || { profile: form });
    const currentCvUrl = currentProfile?.cv_path ? `${backendBase}/storage/${currentProfile.cv_path}` : '';
    const currentPhotoUrl = photoPreview || (currentProfile?.photo_path ? `${backendBase}/storage/${currentProfile.photo_path}` : '');

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await api.get('/auth/me');
                const user = response?.data?.user;
                setCurrentUser(user);
                setForm({
                    ville: user?.candidatProfile?.ville || '',
                    experience: user?.candidatProfile?.experience || '',
                    poste_recherche: user?.candidatProfile?.poste_recherche || '',
                });
                localStorage.setItem('user', JSON.stringify(user));
            } catch (requestError) {
                setError(requestError?.response?.data?.message || 'Impossible de charger le profil.');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    const handleCvSelection = (file) => {
        if (!file) return;
        if (!isPdf(file)) {
            setError('Le CV doit etre un PDF.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError('Le CV depasse 2MB.');
            return;
        }
        setError('');
        setCvFile(file);
    };

    const handlePhotoSelection = (file) => {
        if (!file) return;
        if (!isValidImage(file)) {
            setError('La photo doit etre en JPEG ou PNG.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError('La photo depasse 2MB.');
            return;
        }
        setError('');
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const onCvDrop = (event) => {
        event.preventDefault();
        handleCvSelection(event.dataTransfer.files?.[0]);
    };

    const onPhotoDrop = (event) => {
        event.preventDefault();
        handlePhotoSelection(event.dataTransfer.files?.[0]);
    };

    const saveProfile = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');

        const payload = new FormData();
        payload.append('ville', form.ville);
        payload.append('experience', form.experience);
        payload.append('poste_recherche', form.poste_recherche);
        if (cvFile) payload.append('cv', cvFile);
        if (photoFile) payload.append('photo', photoFile);

        try {
            const response = await api.patch('/auth/me', payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const user = response?.data?.user;
            setCurrentUser(user);
            localStorage.setItem('user', JSON.stringify(user));
            setToast('Profil mis a jour avec succes.');
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

            <main className="container mx-auto px-6 pt-32 pb-16">
                <section className="mb-8">
                    <h1 className="text-4xl font-black text-white">Mon Profil</h1>
                    <p className="mt-2 text-white/60">Mettez a jour votre profil candidat pour augmenter vos chances.</p>
                </section>

                {error && (
                    <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-200">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="rounded-3xl border border-borderGlass bg-surface px-6 py-16 text-center">
                        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                        <p className="text-white/60">Chargement du profil...</p>
                    </div>
                ) : (
                    <div className="grid gap-8 lg:grid-cols-3">
                        <section className="lg:col-span-2 rounded-3xl border border-borderGlass bg-surface p-6 md:p-8">
                            <h2 className="text-lg font-semibold text-white mb-5">Informations personnelles</h2>

                            <form onSubmit={saveProfile} className="space-y-5">
                                <div>
                                    <label className="mb-2 block text-xs uppercase tracking-wider text-white/55">Ville</label>
                                    <input
                                        value={form.ville}
                                        onChange={(event) => setForm((prev) => ({ ...prev, ville: event.target.value }))}
                                        className="w-full rounded-xl border border-borderGlass bg-obsidian/60 px-4 py-3 text-white focus:border-accent/50 focus:outline-none"
                                        placeholder="Casablanca"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs uppercase tracking-wider text-white/55">Experience</label>
                                    <input
                                        value={form.experience}
                                        onChange={(event) => setForm((prev) => ({ ...prev, experience: event.target.value }))}
                                        className="w-full rounded-xl border border-borderGlass bg-obsidian/60 px-4 py-3 text-white focus:border-accent/50 focus:outline-none"
                                        placeholder="2 ans en hotellerie"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs uppercase tracking-wider text-white/55">Poste recherche</label>
                                    <input
                                        value={form.poste_recherche}
                                        onChange={(event) => setForm((prev) => ({ ...prev, poste_recherche: event.target.value }))}
                                        className="w-full rounded-xl border border-borderGlass bg-obsidian/60 px-4 py-3 text-white focus:border-accent/50 focus:outline-none"
                                        placeholder="Receptionniste"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-70"
                                >
                                    {saving ? 'Enregistrement...' : 'Sauvegarder le profil'}
                                </button>
                            </form>
                        </section>

                        <aside className="lg:col-span-1 space-y-6">
                            <div className="rounded-3xl border border-borderGlass bg-surface p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Completion du profil</h3>
                                <div className="mb-2 flex justify-between text-xs uppercase tracking-wider text-white/55">
                                    <span>Progression</span>
                                    <span>{completion}%</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${completion}%` }} />
                                </div>
                            </div>

                            <div className="rounded-3xl border border-borderGlass bg-surface p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">CV (PDF)</h3>
                                <label
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={onCvDrop}
                                    className="block rounded-2xl border border-dashed border-borderGlass bg-obsidian/40 p-4 text-center cursor-pointer hover:border-accent/50 transition-colors"
                                >
                                    <input
                                        type="file"
                                        accept="application/pdf,.pdf"
                                        className="hidden"
                                        onChange={(event) => handleCvSelection(event.target.files?.[0])}
                                    />
                                    <UploadCloud size={18} className="mx-auto mb-2 text-accent" />
                                    <p className="text-sm text-white/80">{cvFile ? cvFile.name : 'Glissez-deposez votre CV ou cliquez'}</p>
                                    <p className="mt-1 text-xs text-white/50">PDF max 2MB</p>
                                </label>

                                {currentCvUrl && (
                                    <a
                                        href={currentCvUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-3 inline-flex items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:text-white hover:border-accent/40"
                                    >
                                        <FileText size={13} />
                                        Voir le CV actuel
                                    </a>
                                )}
                            </div>

                            <div className="rounded-3xl border border-borderGlass bg-surface p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Photo profil</h3>
                                <label
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={onPhotoDrop}
                                    className="block rounded-2xl border border-dashed border-borderGlass bg-obsidian/40 p-4 text-center cursor-pointer hover:border-accent/50 transition-colors"
                                >
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png"
                                        className="hidden"
                                        onChange={(event) => handlePhotoSelection(event.target.files?.[0])}
                                    />
                                    <ImageIcon size={18} className="mx-auto mb-2 text-accent" />
                                    <p className="text-sm text-white/80">{photoFile ? photoFile.name : 'JPEG/PNG max 2MB'}</p>
                                </label>

                                {currentPhotoUrl && (
                                    <img
                                        src={currentPhotoUrl}
                                        alt="Apercu photo profil"
                                        className="mt-4 h-36 w-full rounded-2xl object-cover border border-borderGlass"
                                    />
                                )}
                            </div>
                        </aside>
                    </div>
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
