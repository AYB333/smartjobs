import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, CheckCircle2, ShieldAlert } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

const cardElementOptions = {
    style: {
        base: {
            color: '#ffffff',
            fontSize: '15px',
            fontFamily: 'Inter, sans-serif',
            '::placeholder': { color: 'rgba(255,255,255,0.45)' },
        },
        invalid: { color: '#f87171' },
    },
};

function CheckoutForm({ clientSecret, paymentIntentId, packageType, onSuccess, disabled }) {
    const stripe = useStripe();
    const elements = useElements();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const submitPayment = async (event) => {
        event.preventDefault();
        setError('');

        if (!stripe || !elements) {
            setError('Stripe n est pas pret.');
            return;
        }

        const card = elements.getElement(CardElement);
        if (!card) {
            setError('Impossible de lire les informations de carte.');
            return;
        }

        setSubmitting(true);

        try {
            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: { card },
            });

            if (result.error) {
                setError(result.error.message || 'Paiement refuse.');
                return;
            }

            if (result.paymentIntent?.status === 'succeeded') {
                await api.post('/payment/confirm', {
                    payment_intent_id: paymentIntentId,
                    package_type: packageType,
                });
                onSuccess();
                return;
            }

            setError('Paiement non valide.');
        } catch (requestError) {
            setError(requestError?.response?.data?.message || 'Erreur de confirmation du paiement.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={submitPayment} className="space-y-4">
            <div className="rounded-xl border border-borderGlass bg-obsidian/60 px-4 py-3">
                <CardElement options={cardElementOptions} />
            </div>
            <p className="text-xs text-white/45">
                Carte test Stripe: 4242 4242 4242 4242 · date future · CVC libre.
            </p>
            {error && <p className="text-sm text-rose-300">{error}</p>}
            <button
                type="submit"
                disabled={disabled || submitting || !stripe}
                className="w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
            >
                {submitting ? 'Validation du paiement...' : 'Activer Premium'}
            </button>
        </form>
    );
}

export default function PremiumPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [subscription, setSubscription] = useState({
        is_premium: false,
        expires_at: null,
        days_remaining: 0,
    });
    const [packageType, setPackageType] = useState('monthly');
    const [intentLoading, setIntentLoading] = useState(false);
    const [clientSecret, setClientSecret] = useState('');
    const [paymentIntentId, setPaymentIntentId] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const hasStripe = useMemo(() => Boolean(stripePromise && publishableKey), []);

    const loadSubscription = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const response = await api.get('/payment/subscription');
            setSubscription(response?.data?.data || {});
        } catch (requestError) {
            setError(requestError?.response?.data?.message || "Impossible de recuperer l'etat de l'abonnement.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadSubscription();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [loadSubscription]);

    const preparePayment = async () => {
        setIntentLoading(true);
        setError('');
        setSuccessMessage('');
        setClientSecret('');
        setPaymentIntentId('');

        try {
            const response = await api.post('/payment/create-intent', { package_type: packageType });
            setClientSecret(response?.data?.client_secret || '');
            setPaymentIntentId(response?.data?.payment_intent_id || '');
        } catch (requestError) {
            setError(requestError?.response?.data?.message || 'Impossible de preparer le paiement.');
        } finally {
            setIntentLoading(false);
        }
    };

    const handleSuccess = async () => {
        setSuccessMessage('Premium active avec succes.');
        setClientSecret('');
        setPaymentIntentId('');
        try {
            const rawUser = localStorage.getItem('user');
            const user = rawUser ? JSON.parse(rawUser) : {};
            localStorage.setItem('user', JSON.stringify({ ...user, is_premium: true }));
        } catch {
            localStorage.setItem('user', JSON.stringify({ is_premium: true }));
        }
        await loadSubscription();
        window.setTimeout(() => {
            navigate('/recruteur/dashboard', { replace: true });
        }, 2000);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-obsidian">
            <Navbar />

            <main className="container mx-auto px-6 pt-32 pb-16">
                <section className="mb-8">
                    <h1 className="text-4xl font-black text-white">Offre Premium Recruteur</h1>
                    <p className="mt-2 text-white/60">Passez au premium pour debloquer un recrutement sans limite.</p>
                </section>

                {error && (
                    <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-200">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-emerald-200"
                    >
                        <CheckCircle2 className="text-emerald-300" size={20} />
                        {successMessage}
                    </motion.div>
                )}

                {loading ? (
                    <div className="rounded-3xl border border-borderGlass bg-surface px-6 py-16 text-center">
                        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                        <p className="text-white/60">Chargement abonnement...</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 flex flex-wrap items-center gap-3">
                            <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
                                subscription?.is_premium
                                    ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                                    : 'border-amber-400/30 bg-amber-500/15 text-amber-200'
                            }`}>
                                {subscription?.is_premium ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />}
                                {subscription?.is_premium ? 'Premium actif' : 'Plan gratuit'}
                            </span>
                            {subscription?.is_premium && (
                                <p className="text-sm text-white/70">
                                    Expire le {subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString('fr-FR') : '-'} ·
                                    {' '}{subscription?.days_remaining ?? 0} jours restants
                                </p>
                            )}
                        </div>

                        <section className="grid gap-6 md:grid-cols-2">
                            <div className="rounded-3xl border border-borderGlass bg-surface p-6">
                                <h2 className="text-2xl font-bold text-white">Gratuit</h2>
                                <p className="mt-2 text-white/60">Plan de base pour debuter.</p>
                                <ul className="mt-5 space-y-2 text-sm text-white/70">
                                    <li>• 1 profil candidat / jour</li>
                                    <li>• Visibilite standard</li>
                                    <li>• Support prioritaire non inclus</li>
                                </ul>
                            </div>

                            <div className="rounded-3xl border border-accent/40 bg-accent/10 p-6 shadow-[0_0_35px_rgba(232,101,26,0.2)]">
                                <p className="inline-flex items-center gap-2 rounded-full border border-accent/50 bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                                    <Crown size={13} />
                                    Premium
                                </p>
                                <h2 className="mt-3 text-2xl font-bold text-white">Acces illimite</h2>
                                <p className="mt-2 text-white/70">Recrutez sans quotas et boostez vos offres.</p>
                                <ul className="mt-5 space-y-2 text-sm text-white/80">
                                    <li>• Consultation profils illimitee</li>
                                    <li>• Offres illimitees</li>
                                    <li>• Priorite sur le support</li>
                                </ul>

                                <div className="mt-6 grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPackageType('monthly')}
                                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                                            packageType === 'monthly'
                                                ? 'border-accent bg-accent text-white'
                                                : 'border-borderGlass bg-white/5 text-white/75 hover:text-white'
                                        }`}
                                    >
                                        Mensuel · $10
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPackageType('yearly')}
                                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                                            packageType === 'yearly'
                                                ? 'border-accent bg-accent text-white'
                                                : 'border-borderGlass bg-white/5 text-white/75 hover:text-white'
                                        }`}
                                    >
                                        Annuel · $100
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section className="mt-8 rounded-3xl border border-borderGlass bg-surface p-6 md:p-8">
                            <h3 className="text-xl font-semibold text-white mb-2">Paiement securise Stripe</h3>
                            <p className="text-white/60 mb-5">Confirmez votre carte pour activer Premium immediatement.</p>

                            {!hasStripe && (
                                <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-amber-100">
                                    Definissez `VITE_STRIPE_PUBLISHABLE_KEY` dans le frontend pour afficher Stripe Elements.
                                </div>
                            )}

                            {hasStripe && !clientSecret && (
                                <button
                                    type="button"
                                    disabled={intentLoading}
                                    onClick={preparePayment}
                                    className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-70"
                                >
                                    {intentLoading ? 'Preparation...' : 'Continuer vers paiement'}
                                </button>
                            )}

                            {hasStripe && clientSecret && paymentIntentId && (
                                <Elements stripe={stripePromise} options={{ clientSecret }}>
                                    <CheckoutForm
                                        clientSecret={clientSecret}
                                        paymentIntentId={paymentIntentId}
                                        packageType={packageType}
                                        onSuccess={handleSuccess}
                                        disabled={intentLoading}
                                    />
                                </Elements>
                            )}
                        </section>
                    </>
                )}
            </main>
        </motion.div>
    );
}
