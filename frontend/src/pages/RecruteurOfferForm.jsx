import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
    CheckCircle2,
    Circle,
    ImagePlus,
    Plus,
    Trash2,
    WandSparkles,
    X,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api/axios';

function extractEntity(payload) {
    return payload?.data ?? payload ?? null;
}

function createEmptyQuestion() {
    return {
        id: Date.now() + Math.random(),
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_key: 'A',
    };
}

function mapQuestionPayload(question) {
    const optionsMap = {
        A: question.option_a,
        B: question.option_b,
        C: question.option_c,
        D: question.option_d,
    };

    return {
        question_text: question.question_text.trim(),
        options: Object.values(optionsMap).map((value) => value.trim()),
        correct_answer: optionsMap[question.correct_key].trim(),
    };
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_OFFER_IMAGE_SIZE = 2 * 1024 * 1024;

export default function RecruteurOfferForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);
    const [step, setStep] = useState(1);
    const [loadingOffer, setLoadingOffer] = useState(Boolean(id));
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [existingImageUrl, setExistingImageUrl] = useState('');
    const [imageInputKey, setImageInputKey] = useState(0);

    const [offerForm, setOfferForm] = useState({
        titre_poste: '',
        description: '',
        ville: '',
        salaire: '',
        type_contrat: 'CDI',
        duree_validite: '15',
    });

    const [withQuiz, setWithQuiz] = useState(false);
    const [quizForm, setQuizForm] = useState({
        titre: '',
        passing_score: 60,
    });
    const [questions, setQuestions] = useState([createEmptyQuestion()]);

    const stepMeta = useMemo(() => ([
        { id: 1, label: "Details de l'offre" },
        { id: 2, label: 'Quiz optionnel' },
    ]), []);
    const qualityItems = useMemo(() => ([
        { label: 'Titre clair', done: offerForm.titre_poste.trim().length >= 4 },
        { label: 'Description detaillee', done: offerForm.description.trim().length >= 80 },
        { label: 'Salaire indique', done: offerForm.salaire !== '' && Number(offerForm.salaire) > 0 },
        { label: 'Photo ajoutee', done: Boolean(imageFile || existingImageUrl) },
        { label: 'Quiz de preselection', done: Boolean(withQuiz && questions.length > 0 && questions[0]?.question_text?.trim()) },
    ]), [existingImageUrl, imageFile, offerForm.description, offerForm.salaire, offerForm.titre_poste, questions, withQuiz]);
    const qualityScore = Math.round((qualityItems.filter((item) => item.done).length / qualityItems.length) * 100);

    const loadOffer = useCallback(async () => {
        if (!id) return;

        setLoadingOffer(true);
        setError('');

        try {
            const response = await api.get(`/offres/${id}`);
            const offer = extractEntity(response?.data);
            setOfferForm({
                titre_poste: offer?.titre_poste || '',
                description: offer?.description || '',
                ville: offer?.ville || '',
                salaire: offer?.salaire ?? '',
                type_contrat: offer?.type_contrat || 'CDI',
                duree_validite: String(offer?.duree_validite || '15'),
            });
            setExistingImageUrl(offer?.image_url || '');
            setImagePreview(offer?.image_url || '');
            setImageFile(null);
        } catch (requestError) {
            setError(requestError?.response?.data?.message || "Impossible de charger l'offre.");
        } finally {
            setLoadingOffer(false);
        }
    }, [id]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadOffer();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [loadOffer]);

    useEffect(() => {
        return () => {
            if (imagePreview.startsWith('blob:')) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const handleOfferField = (field, value) => {
        setOfferForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleImageChange = (event) => {
        const file = event.target.files?.[0] ?? null;

        if (!file) {
            return;
        }

        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            setError('Format image invalide. Utilisez JPG, PNG ou WEBP.');
            event.target.value = '';
            return;
        }

        if (file.size > MAX_OFFER_IMAGE_SIZE) {
            setError("L'image depasse 2MB.");
            event.target.value = '';
            return;
        }

        setError('');
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const clearSelectedImage = () => {
        setImageFile(null);
        setImagePreview(existingImageUrl || '');
        setImageInputKey((prev) => prev + 1);
    };

    const handleQuizField = (field, value) => {
        setQuizForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleQuestionField = (id, field, value) => {
        setQuestions((prev) =>
            prev.map((question) => (question.id === id ? { ...question, [field]: value } : question))
        );
    };

    const addQuestion = () => setQuestions((prev) => [...prev, createEmptyQuestion()]);
    const removeQuestion = (id) => {
        setQuestions((prev) => (prev.length === 1 ? prev : prev.filter((question) => question.id !== id)));
    };

    const validateStepOne = () => {
        if (!offerForm.titre_poste.trim()) return "Le titre du poste est requis.";
        if (!offerForm.description.trim()) return 'La description est requise.';
        if (!offerForm.ville.trim()) return 'La ville est requise.';
        if (!offerForm.type_contrat) return 'Le type de contrat est requis.';
        if (!offerForm.duree_validite) return 'La duree de validite est requise.';
        if (offerForm.salaire && Number(offerForm.salaire) < 0) return 'Le salaire doit etre positif.';
        return '';
    };

    const validateQuiz = () => {
        if (!withQuiz) return '';
        if (!quizForm.passing_score && quizForm.passing_score !== 0) return 'Le passing score est requis.';
        if (Number(quizForm.passing_score) < 0 || Number(quizForm.passing_score) > 100) {
            return 'Le passing score doit etre entre 0 et 100.';
        }
        if (!questions.length) return 'Ajoutez au moins une question.';

        for (const question of questions) {
            if (!question.question_text.trim()) return 'Chaque question doit avoir un enonce.';
            if (!question.option_a.trim() || !question.option_b.trim() || !question.option_c.trim() || !question.option_d.trim()) {
                return 'Chaque question doit inclure les options A, B, C et D.';
            }
            const correctValue = question[`option_${question.correct_key.toLowerCase()}`];
            if (!correctValue?.trim()) {
                return 'La bonne reponse doit pointer vers une option non vide.';
            }
        }
        return '';
    };

    const goToStepTwo = () => {
        const validationError = validateStepOne();
        setError(validationError);
        if (!validationError) {
            setStep(2);
        }
    };

    const handleSubmit = async () => {
        setError('');
        setSuccessMessage('');

        const validationStepOne = validateStepOne();
        if (validationStepOne) {
            setError(validationStepOne);
            setStep(1);
            return;
        }

        const validationQuiz = isEditMode ? '' : validateQuiz();
        if (validationQuiz) {
            setError(validationQuiz);
            return;
        }

        setSubmitting(true);
        let offerId = null;

        try {
            const offerPayload = {
                ...offerForm,
                salaire: offerForm.salaire ? Number(offerForm.salaire) : null,
            };
            const hasImage = Boolean(imageFile);
            const requestPayload = hasImage ? new FormData() : offerPayload;
            const multipartConfig = { headers: { 'Content-Type': 'multipart/form-data' } };

            if (hasImage) {
                Object.entries(offerPayload).forEach(([key, value]) => {
                    requestPayload.append(key, value === null ? '' : value);
                });
                requestPayload.append('image', imageFile);
            }

            if (isEditMode) {
                if (hasImage) {
                    requestPayload.append('_method', 'PUT');
                    await api.post(`/offres/${id}`, requestPayload, multipartConfig);
                } else {
                    await api.put(`/offres/${id}`, requestPayload);
                }
                setSuccessMessage('Offre mise a jour avec succes.');
                setTimeout(() => navigate('/recruteur/dashboard', { replace: true }), 900);
                return;
            }

            const offerResponse = await api.post('/offres', requestPayload, hasImage ? multipartConfig : undefined);
            const createdOffer = extractEntity(offerResponse?.data);
            offerId = createdOffer?.id;

            if (!offerId) {
                throw new Error("Creation de l'offre reussie mais id introuvable.");
            }

            if (withQuiz) {
                const quizPayload = {
                    titre: quizForm.titre.trim() || `Quiz - ${offerForm.titre_poste}`,
                    passing_score: Number(quizForm.passing_score),
                };

                const quizResponse = await api.post(`/offres/${offerId}/quiz`, quizPayload);
                const createdQuiz = extractEntity(quizResponse?.data);
                const quizId = createdQuiz?.id;

                if (!quizId) {
                    throw new Error('Quiz cree mais id introuvable.');
                }

                for (const question of questions) {
                    const payload = mapQuestionPayload(question);
                    await api.post(`/quizzes/${quizId}/questions`, payload);
                }
            }

            setSuccessMessage('Offre creee avec succes.');
            setTimeout(() => navigate('/recruteur/dashboard', { replace: true }), 900);
        } catch (requestError) {
            const apiMessage = requestError?.response?.data?.message;
            const baseMessage = requestError?.message || 'Impossible de creer cette offre.';
            if (offerId && withQuiz && !apiMessage) {
                setError(`${baseMessage} L'offre est creee, mais la creation du quiz a echoue.`);
            } else {
                setError(apiMessage || baseMessage);
            }
        } finally {
            setSubmitting(false);
        }
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
                <section className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-black text-white">
                        {isEditMode ? 'Modifier une offre' : 'Creer une offre'}
                    </h1>
                    <p className="mt-2 text-white/60">
                        {isEditMode ? 'Mettez a jour les informations principales de l offre.' : 'Publication en 2 etapes: details puis quiz optionnel.'}
                    </p>
                </section>

                {!isEditMode && (
                    <section className="mb-8 rounded-3xl border border-borderGlass bg-surface p-5 md:p-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        {stepMeta.map((item) => {
                            const active = step === item.id;
                            const done = step > item.id;
                            return (
                                <div key={item.id} className="flex items-center gap-3">
                                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${
                                        done
                                            ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                                            : active
                                                ? 'border-accent/40 bg-accent/15 text-accent'
                                                : 'border-borderGlass bg-white/5 text-white/45'
                                    }`}>
                                        {done ? <CheckCircle2 size={15} /> : <Circle size={14} />}
                                    </span>
                                    <span className={`text-sm ${active ? 'text-white' : 'text-white/55'}`}>{item.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>
                )}

                {error && (
                    <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-200">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-emerald-200">
                        {successMessage}
                    </div>
                )}

                <section className="rounded-3xl border border-borderGlass bg-surface p-6 md:p-8">
                    {loadingOffer ? (
                        <div className="py-12 text-center">
                            <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                            <p className="text-white/60">Chargement de l'offre...</p>
                        </div>
                    ) : (
                    <>
                    <div className="mb-6 rounded-2xl border border-borderGlass bg-obsidian/45 p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-accent">Qualite de l'offre</p>
                                <h2 className="mt-1 text-xl font-bold text-white">{qualityScore}% complet</h2>
                                <p className="mt-1 text-sm text-white/55">
                                    Une offre complete attire plus de candidats et facilite le tri.
                                </p>
                            </div>
                            <div className="min-w-44">
                                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${qualityScore}%` }} />
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {qualityItems.map((item) => (
                                <span
                                    key={item.label}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                                        item.done
                                            ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                                            : 'border-white/10 bg-white/5 text-white/45'
                                    }`}
                                >
                                    <CheckCircle2 size={12} />
                                    {item.label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {step === 1 ? (
                        <div className="space-y-5">
                            <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs uppercase tracking-wider text-white/55">Titre du poste</label>
                                    <input
                                        value={offerForm.titre_poste}
                                        onChange={(event) => handleOfferField('titre_poste', event.target.value)}
                                        className="w-full rounded-xl border border-borderGlass bg-obsidian/65 px-4 py-3 text-white focus:border-accent/50 focus:outline-none"
                                        placeholder="Chef de partie, Receptionniste..."
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs uppercase tracking-wider text-white/55">Ville</label>
                                    <input
                                        value={offerForm.ville}
                                        onChange={(event) => handleOfferField('ville', event.target.value)}
                                        className="w-full rounded-xl border border-borderGlass bg-obsidian/65 px-4 py-3 text-white focus:border-accent/50 focus:outline-none"
                                        placeholder="Casablanca"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs uppercase tracking-wider text-white/55">Description</label>
                                <textarea
                                    rows={6}
                                    value={offerForm.description}
                                    onChange={(event) => handleOfferField('description', event.target.value)}
                                    className="w-full rounded-xl border border-borderGlass bg-obsidian/65 px-4 py-3 text-white focus:border-accent/50 focus:outline-none"
                                    placeholder="Missions, profil recherche, horaires, avantages..."
                                />
                            </div>

                            <div className="rounded-2xl border border-dashed border-borderGlass bg-obsidian/45 p-4">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                                    <div className="flex h-36 w-full items-center justify-center overflow-hidden rounded-2xl border border-borderGlass bg-white/5 md:w-52">
                                        {imagePreview ? (
                                            <img
                                                src={imagePreview}
                                                alt="Apercu de l'offre"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-white/45">
                                                <ImagePlus size={24} className="text-accent" />
                                                <span className="text-xs font-medium">Aucune photo</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <label className="mb-2 block text-xs uppercase tracking-wider text-white/55">Image de l'offre</label>
                                        <p className="text-sm text-white/65">
                                            Photo optionnelle de l'établissement ou du lieu de travail.
                                        </p>
                                        <p className="mt-1 text-xs text-white/45">
                                            Le type d'établissement permet d'afficher une image par défaut si aucune photo n'est ajoutée.
                                        </p>
                                        <p className="mt-1 text-xs text-white/45">JPG, PNG ou WEBP - 2MB max.</p>

                                        <div className="mt-4 flex flex-wrap items-center gap-3">
                                            <label
                                                htmlFor="offer-image-upload"
                                                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:border-accent/50 hover:text-white"
                                            >
                                                <ImagePlus size={15} className="text-accent" />
                                                Choisir une photo
                                            </label>
                                            <input
                                                key={imageInputKey}
                                                id="offer-image-upload"
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={handleImageChange}
                                                className="hidden"
                                            />

                                            {imageFile && (
                                                <button
                                                    type="button"
                                                    onClick={clearSelectedImage}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-borderGlass bg-white/5 px-3 py-2 text-xs font-medium text-white/65 transition-colors hover:border-rose-400/40 hover:text-rose-300"
                                                >
                                                    <X size={13} />
                                                    Retirer
                                                </button>
                                            )}
                                        </div>

                                        {imageFile && (
                                            <p className="mt-3 truncate text-xs text-white/55">
                                                Selection: {imageFile.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-5 md:grid-cols-3">
                                <div>
                                    <label className="mb-2 block text-xs uppercase tracking-wider text-white/55">Salaire (MAD)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={offerForm.salaire}
                                        onChange={(event) => handleOfferField('salaire', event.target.value)}
                                        className="w-full rounded-xl border border-borderGlass bg-obsidian/65 px-4 py-3 text-white focus:border-accent/50 focus:outline-none"
                                        placeholder="Optionnel"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs uppercase tracking-wider text-white/55">Type de contrat</label>
                                    <select
                                        value={offerForm.type_contrat}
                                        onChange={(event) => handleOfferField('type_contrat', event.target.value)}
                                        className="w-full rounded-xl border border-borderGlass bg-obsidian/65 px-4 py-3 text-white focus:border-accent/50 focus:outline-none"
                                    >
                                        <option value="CDI">CDI</option>
                                        <option value="CDD">CDD</option>
                                        <option value="Extra">Extra</option>
                                        <option value="Saisonnier">Saisonnier</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs uppercase tracking-wider text-white/55">Duree de validite</label>
                                    <select
                                        value={offerForm.duree_validite}
                                        onChange={(event) => handleOfferField('duree_validite', event.target.value)}
                                        className="w-full rounded-xl border border-borderGlass bg-obsidian/65 px-4 py-3 text-white focus:border-accent/50 focus:outline-none"
                                    >
                                        <option value="7">7 jours</option>
                                        <option value="15">15 jours</option>
                                        <option value="30">30 jours</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2">
                                {isEditMode ? (
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-70"
                                    >
                                        {submitting ? 'Enregistrement...' : "Enregistrer l'offre"}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={goToStepTwo}
                                        className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
                                    >
                                        Continuer vers le quiz
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-start justify-between gap-4 rounded-2xl border border-borderGlass bg-obsidian/55 p-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Quiz QCM (optionnel)</h3>
                                    <p className="mt-1 text-sm text-white/60">
                                        Ajoutez un test de preselection pour qualifier les candidatures.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setWithQuiz((prev) => !prev)}
                                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                                        withQuiz
                                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                                            : 'bg-white/5 text-white/70 border border-borderGlass'
                                    }`}
                                >
                                    {withQuiz ? 'Quiz active' : 'Activer quiz'}
                                </button>
                            </div>

                            {withQuiz && (
                                <>
                                    <div className="grid gap-5 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-xs uppercase tracking-wider text-white/55">Titre du quiz</label>
                                            <input
                                                value={quizForm.titre}
                                                onChange={(event) => handleQuizField('titre', event.target.value)}
                                                className="w-full rounded-xl border border-borderGlass bg-obsidian/65 px-4 py-3 text-white focus:border-accent/50 focus:outline-none"
                                                placeholder="Quiz service client"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs uppercase tracking-wider text-white/55">Passing score (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={quizForm.passing_score}
                                                onChange={(event) => handleQuizField('passing_score', event.target.value)}
                                                className="w-full rounded-xl border border-borderGlass bg-obsidian/65 px-4 py-3 text-white focus:border-accent/50 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {questions.map((question, index) => (
                                            <div key={question.id} className="rounded-2xl border border-borderGlass bg-obsidian/55 p-4">
                                                <div className="mb-3 flex items-center justify-between gap-3">
                                                    <p className="text-sm font-semibold text-white">Question {index + 1}</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeQuestion(question.id)}
                                                        className="inline-flex items-center gap-1 rounded-full border border-borderGlass bg-white/5 px-3 py-1 text-xs text-white/70 hover:text-white"
                                                    >
                                                        <Trash2 size={13} />
                                                        Supprimer
                                                    </button>
                                                </div>

                                                <div className="space-y-3">
                                                    <input
                                                        value={question.question_text}
                                                        onChange={(event) => handleQuestionField(question.id, 'question_text', event.target.value)}
                                                        className="w-full rounded-xl border border-borderGlass bg-obsidian/65 px-4 py-3 text-white focus:border-accent/50 focus:outline-none"
                                                        placeholder="Enonce de la question"
                                                    />

                                                    <div className="grid gap-3 md:grid-cols-2">
                                                        <input
                                                            value={question.option_a}
                                                            onChange={(event) => handleQuestionField(question.id, 'option_a', event.target.value)}
                                                            className="w-full rounded-xl border border-borderGlass bg-obsidian/65 px-4 py-3 text-white focus:border-accent/50 focus:outline-none"
                                                            placeholder="Option A"
                                                        />
                                                        <input
                                                            value={question.option_b}
                                                            onChange={(event) => handleQuestionField(question.id, 'option_b', event.target.value)}
                                                            className="w-full rounded-xl border border-borderGlass bg-obsidian/65 px-4 py-3 text-white focus:border-accent/50 focus:outline-none"
                                                            placeholder="Option B"
                                                        />
                                                        <input
                                                            value={question.option_c}
                                                            onChange={(event) => handleQuestionField(question.id, 'option_c', event.target.value)}
                                                            className="w-full rounded-xl border border-borderGlass bg-obsidian/65 px-4 py-3 text-white focus:border-accent/50 focus:outline-none"
                                                            placeholder="Option C"
                                                        />
                                                        <input
                                                            value={question.option_d}
                                                            onChange={(event) => handleQuestionField(question.id, 'option_d', event.target.value)}
                                                            className="w-full rounded-xl border border-borderGlass bg-obsidian/65 px-4 py-3 text-white focus:border-accent/50 focus:outline-none"
                                                            placeholder="Option D"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="mb-2 block text-xs uppercase tracking-wider text-white/55">Bonne reponse</label>
                                                        <select
                                                            value={question.correct_key}
                                                            onChange={(event) => handleQuestionField(question.id, 'correct_key', event.target.value)}
                                                            className="w-full rounded-xl border border-borderGlass bg-obsidian/65 px-4 py-3 text-white focus:border-accent/50 focus:outline-none md:w-52"
                                                        >
                                                            <option value="A">A</option>
                                                            <option value="B">B</option>
                                                            <option value="C">C</option>
                                                            <option value="D">D</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={addQuestion}
                                            className="inline-flex items-center gap-2 rounded-full border border-borderGlass bg-white/5 px-4 py-2 text-sm text-white/80 hover:text-white hover:border-accent/50"
                                        >
                                            <Plus size={15} />
                                            Ajouter une question
                                        </button>
                                    </div>
                                </>
                            )}

                            <div className="flex flex-wrap gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="rounded-full border border-borderGlass bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 hover:text-white hover:border-accent/50"
                                >
                                    Retour
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-70"
                                >
                                    <WandSparkles size={15} />
                                    {submitting ? 'Publication en cours...' : "Publier l'offre"}
                                </button>
                            </div>
                        </div>
                    )}
                    </>
                    )}
                </section>
            </main>
        </motion.div>
    );
}
