import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import api from '../api/axios';

const optionLabels = ['A', 'B', 'C', 'D'];

function extractQuiz(payload) {
    return payload?.data ?? payload ?? null;
}

export default function QuizPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [quiz, setQuiz] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);

    useEffect(() => {
        const fetchQuiz = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await api.get(`/offres/${id}/pass-quiz`);
                setQuiz(extractQuiz(response?.data));
            } catch (requestError) {
                if (requestError?.response?.status === 404) {
                    navigate('/candidat/dashboard', { replace: true });
                    return;
                }
                setError(requestError?.response?.data?.message || 'Impossible de charger le quiz.');
            } finally {
                setLoading(false);
            }
        };

        fetchQuiz();
    }, [id, navigate]);

    useEffect(() => {
        if (!result) return undefined;

        const timeoutId = window.setTimeout(() => {
            navigate('/candidat/dashboard', { replace: true });
        }, 3000);

        return () => window.clearTimeout(timeoutId);
    }, [navigate, result]);

    const questions = quiz?.questions || [];
    const total = questions.length;
    const currentQuestion = questions[currentIndex];
    const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;
    const isLast = currentIndex === total - 1;

    const answeredCount = useMemo(
        () => Object.values(answers).filter((value) => typeof value === 'string' && value.length > 0).length,
        [answers]
    );

    const selectAnswer = (questionId, optionValue) => {
        setAnswers((prev) => ({ ...prev, [questionId]: optionValue }));
    };

    const submitQuiz = async () => {
        if (!questions.length) return;

        if (answeredCount < questions.length) {
            setError('Veuillez repondre a toutes les questions avant validation.');
            return;
        }

        setSubmitting(true);
        setError('');

        const payload = {
            answers: questions.map((question) => ({
                question_id: question.id,
                answer: answers[question.id],
            })),
        };

        try {
            const response = await api.post(`/offres/${id}/pass-quiz/submit`, payload);
            setResult(response?.data?.data || null);
        } catch (requestError) {
            setError(requestError?.response?.data?.message || 'Erreur lors de la soumission du quiz.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-obsidian px-4 py-10 md:px-8"
        >
            <div className="mx-auto w-full max-w-4xl">
                {loading ? (
                    <div className="rounded-3xl border border-borderGlass bg-surface px-6 py-20 text-center">
                        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                        <p className="text-white/60">Chargement du quiz...</p>
                    </div>
                ) : error && !quiz ? (
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-5 text-rose-200">
                        <p className="text-sm font-semibold">{error}</p>
                        <button
                            type="button"
                            onClick={() => navigate('/jobs', { replace: true })}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-300/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                        >
                            <ArrowLeft size={15} />
                            Retour aux offres
                        </button>
                    </div>
                ) : result ? (
                    <motion.section
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-3xl border border-borderGlass bg-surface p-8 text-center"
                    >
                        <h1 className="text-4xl font-black text-white">Resultat du quiz</h1>
                        <p className="mt-6 text-6xl font-black text-accent">{result?.score ?? 0}%</p>
                        <p className="mt-4 inline-flex items-center gap-2 text-lg font-semibold">
                            {result?.passed ? (
                                <>
                                    <CheckCircle2 size={18} className="text-emerald-300" />
                                    <span className="text-emerald-200">Reussi</span>
                                </>
                            ) : (
                                <>
                                    <XCircle size={18} className="text-rose-300" />
                                    <span className="text-rose-200">Non valide</span>
                                </>
                            )}
                        </p>
                        <p className="mt-2 text-white/65">Seuil requis: {quiz?.passing_score ?? 50}%</p>

                        <button
                            type="button"
                            onClick={() => navigate('/candidat/dashboard', { replace: true })}
                            className="mt-8 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent/90"
                        >
                            Retour au dashboard
                        </button>
                    </motion.section>
                ) : (
                    <section className="rounded-3xl border border-borderGlass bg-surface p-6 md:p-8">
                        <div className="mb-6">
                            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-white/55">
                                <span>
                                    Question {currentIndex + 1} / {total}
                                </span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentQuestion?.id || currentIndex}
                                initial={{ opacity: 0, x: 24 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -24 }}
                                transition={{ duration: 0.25 }}
                                className="rounded-2xl border border-borderGlass bg-obsidian/50 p-5"
                            >
                                <h2 className="text-xl font-semibold text-white">{currentQuestion?.question_text}</h2>

                                <div className="mt-5 grid gap-3">
                                    {(currentQuestion?.options || []).map((option, index) => {
                                        const selected = answers[currentQuestion.id] === option;
                                        return (
                                            <button
                                                key={`${currentQuestion.id}-${index}`}
                                                type="button"
                                                onClick={() => selectAnswer(currentQuestion.id, option)}
                                                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                                                    selected
                                                        ? 'border-accent bg-accent/10 text-white shadow-[0_0_20px_rgba(232,101,26,0.2)]'
                                                        : 'border-borderGlass bg-white/5 text-white/80 hover:border-accent/40'
                                                }`}
                                            >
                                                <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/25 text-xs">
                                                    {optionLabels[index] || index + 1}
                                                </span>
                                                {option}
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {error && (
                            <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                                {error}
                            </p>
                        )}

                        <div className="mt-6 flex flex-wrap justify-between gap-3">
                            <button
                                type="button"
                                disabled={currentIndex === 0}
                                onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                                className="inline-flex items-center gap-2 rounded-xl border border-borderGlass bg-white/5 px-4 py-2.5 text-sm text-white/80 hover:text-white disabled:opacity-40"
                            >
                                <ArrowLeft size={15} />
                                Precedent
                            </button>

                            {isLast ? (
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={submitQuiz}
                                    className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-70"
                                >
                                    {submitting ? 'Soumission...' : 'Valider le quiz'}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, total - 1))}
                                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent/90"
                                >
                                    Suivant
                                    <ArrowRight size={15} />
                                </button>
                            )}
                        </div>
                    </section>
                )}
            </div>
        </motion.div>
    );
}
