<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePaymentRequest;
use App\Models\CandidateProfileView;
use App\Models\Payment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Stripe\Exception\SignatureVerificationException;
use Stripe\PaymentIntent;
use Stripe\Stripe;
use Stripe\Webhook;

class PaymentController extends Controller
{
    private const FREE_PROFILE_LIMIT = 1;

    public function __construct()
    {
        Stripe::setApiKey(env('STRIPE_SECRET'));
    }

    private function currentRecruteur(): User
    {
        /** @var User $user */
        $user = Auth::user();

        return $user;
    }

    /**
     * Creates a Stripe PaymentIntent and returns client_secret to frontend
     */
    public function createIntent(StorePaymentRequest $request)
    {
        $recruteur = $this->currentRecruteur();
        $package = $request->validated()['package_type'];

        $amount = $package === 'yearly' ? 10000 : 1000; // 100.00 or 10.00 EUR/USD (in cents)

        try {
            $paymentIntent = PaymentIntent::create([
                'amount' => $amount,
                'currency' => 'usd',
                'metadata' => [
                    'recruteur_id' => $recruteur->id,
                    'package_type' => $package,
                ],
            ]);

            return response()->json([
                'success' => true,
                'client_secret' => $paymentIntent->client_secret,
                'payment_intent_id' => $paymentIntent->id,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Le paiement est momentanement indisponible. Verifiez la configuration Stripe et reessayez.',
            ], 500);
        }
    }

    /**
     * After frontend confirms payment -> verify with Stripe -> set is_premium=true
     */
    public function confirm(Request $request)
    {
        $request->validate([
            'payment_intent_id' => 'required|string',
            'package_type' => 'required|in:monthly,yearly',
        ]);

        try {
            $recruteur = $this->currentRecruteur();
            $package = $request->package_type;
            $expectedAmount = $package === 'yearly' ? 10000 : 1000;
            $paymentIntent = PaymentIntent::retrieve($request->payment_intent_id);
            $metadata = $paymentIntent->metadata && method_exists($paymentIntent->metadata, 'toArray')
                ? $paymentIntent->metadata->toArray()
                : [];

            if ((string) ($metadata['recruteur_id'] ?? '') !== (string) $recruteur->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce paiement ne correspond pas a votre compte recruteur.',
                ], 403);
            }

            if (($metadata['package_type'] ?? null) !== $package) {
                return response()->json([
                    'success' => false,
                    'message' => 'Le forfait confirme ne correspond pas au paiement Stripe.',
                ], 422);
            }

            if ((int) $paymentIntent->amount !== $expectedAmount || strtolower((string) $paymentIntent->currency) !== 'usd') {
                return response()->json([
                    'success' => false,
                    'message' => 'Le montant du paiement ne correspond pas au forfait selectionne.',
                ], 422);
            }

            if ($paymentIntent->status !== 'succeeded') {
                return response()->json(['success' => false, 'message' => 'Paiement non valide.'], 400);
            }

            $existingPayment = Payment::where('stripe_payment_id', $paymentIntent->id)->first();
            if ($existingPayment) {
                if ((int) $existingPayment->recruteur_id !== (int) $recruteur->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Ce paiement a deja ete associe a un autre compte.',
                    ], 403);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Paiement deja confirme, votre premium est actif.',
                ]);
            }

            $days = $package === 'yearly' ? 365 : 30;

            // Save payment record
            Payment::create([
                'recruteur_id' => $recruteur->id,
                'amount' => $paymentIntent->amount / 100,
                'package_type' => $package,
                'stripe_payment_id' => $paymentIntent->id,
                'status' => 'succeeded',
            ]);

            // Update Premium Status
            $expiresAt = $recruteur->is_premium && $recruteur->premium_expires_at
                ? Carbon::parse($recruteur->premium_expires_at)->addDays($days)
                : Carbon::now()->addDays($days);

            $recruteur->update([
                'is_premium' => true,
                'premium_expires_at' => $expiresAt,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Paiement reussi, compte mis a niveau vers premium.',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de confirmer le paiement pour le moment.',
            ], 500);
        }
    }

    /**
     * Recruteur sees current subscription status
     */
    public function mySubscription()
    {
        $recruteur = $this->currentRecruteur();
        $days = 0;
        $isPremium = (bool) ($recruteur->is_premium && $recruteur->premium_expires_at && Carbon::parse($recruteur->premium_expires_at)->isFuture());

        if ($isPremium) {
            $days = Carbon::now()->diffInDays(Carbon::parse($recruteur->premium_expires_at), false);
        }

        $latestView = CandidateProfileView::where('recruteur_id', $recruteur->id)
            ->where('viewed_at', '>=', Carbon::now()->subDay())
            ->latest('viewed_at')
            ->first();
        $used = $isPremium ? 0 : ($latestView ? self::FREE_PROFILE_LIMIT : 0);
        $resetAt = $latestView?->viewed_at?->copy()->addDay();

        if (! $isPremium) {
            $recruteur->forceFill([
                'vues_aujourdhui' => $used,
                'derniere_vue_date' => $latestView?->viewed_at?->toDateString(),
            ])->save();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'is_premium' => $isPremium,
                'expires_at' => $recruteur->premium_expires_at,
                'days_remaining' => $days > 0 ? (int) $days : 0,
                'quota' => [
                    'is_premium' => $isPremium,
                    'limit' => self::FREE_PROFILE_LIMIT,
                    'used' => $used,
                    'remaining' => $isPremium ? null : max(self::FREE_PROFILE_LIMIT - $used, 0),
                    'reset_at' => $isPremium ? null : $resetAt,
                ],
            ],
        ]);
    }

    /**
     * Listen to Stripe events
     */
    public function webhook(Request $request)
    {
        $payload = $request->getContent();
        $sig_header = $request->header('Stripe-Signature');
        $endpoint_secret = env('STRIPE_WEBHOOK_SECRET');

        try {
            $event = Webhook::constructEvent(
                $payload, $sig_header, $endpoint_secret
            );
        } catch (\UnexpectedValueException) {
            return response()->json(['error' => 'Invalid payload'], 400);
        } catch (SignatureVerificationException) {
            return response()->json(['error' => 'Invalid signature'], 400);
        }

        if ($event->type === 'payment_intent.succeeded') {
            $paymentIntent = $event->data->object;
            $recruteurId = $paymentIntent->metadata->recruteur_id ?? null;
            $package = $paymentIntent->metadata->package_type ?? 'monthly';

            if ($recruteurId) {
                $user = User::find($recruteurId);
                if ($user) {
                    $days = $package === 'yearly' ? 365 : 30;
                    $expiresAt = $user->is_premium && $user->premium_expires_at
                        ? Carbon::parse($user->premium_expires_at)->addDays($days)
                        : Carbon::now()->addDays($days);

                    $user->update([
                        'is_premium' => true,
                        'premium_expires_at' => $expiresAt,
                    ]);

                    Payment::firstOrCreate([
                        'stripe_payment_id' => $paymentIntent->id,
                    ], [
                        'recruteur_id' => $user->id,
                        'amount' => $paymentIntent->amount / 100,
                        'package_type' => $package,
                        'status' => 'succeeded',
                    ]);
                }
            }
        }

        return response()->json(['status' => 'success'], 200);
    }
}
