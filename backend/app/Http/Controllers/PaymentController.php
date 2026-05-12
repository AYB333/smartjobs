<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\User;
use App\Http\Requests\StorePaymentRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Carbon\Carbon;

class PaymentController extends Controller
{
    public function __construct()
    {
        Stripe::setApiKey(env('STRIPE_SECRET'));
    }

    /**
     * Creates a Stripe PaymentIntent and returns client_secret to frontend
     */
    public function createIntent(StorePaymentRequest $request)
    {
        $recruteur = Auth::user();
        $package = $request->validated()['package_type'];

        $amount = $package === 'yearly' ? 10000 : 1000; // 100.00 or 10.00 EUR/USD (in cents)

        try {
            $paymentIntent = PaymentIntent::create([
                'amount' => $amount,
                'currency' => 'usd',
                'metadata' => [
                    'recruteur_id' => $recruteur->id,
                    'package_type' => $package
                ]
            ]);

            return response()->json([
                'success' => true,
                'client_secret' => $paymentIntent->client_secret,
                'payment_intent_id' => $paymentIntent->id
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
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
            'package_type' => 'required|in:monthly,yearly'
        ]);

        try {
            $paymentIntent = PaymentIntent::retrieve($request->payment_intent_id);

            if ($paymentIntent->status === 'succeeded') {
                $recruteur = Auth::user();
                $package = $request->package_type;
                $days = $package === 'yearly' ? 365 : 30;

                // Save payment record
                Payment::create([
                    'recruteur_id' => $recruteur->id,
                    'amount' => $paymentIntent->amount / 100,
                    'package_type' => $package,
                    'stripe_payment_id' => $paymentIntent->id,
                    'status' => 'succeeded'
                ]);

                // Update Premium Status
                $expiresAt = $recruteur->is_premium && $recruteur->premium_expires_at 
                    ? Carbon::parse($recruteur->premium_expires_at)->addDays($days) 
                    : Carbon::now()->addDays($days);

                $recruteur->update([
                    'is_premium' => true,
                    'premium_expires_at' => $expiresAt
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Paiement reussi, compte mis a niveau vers premium.'
                ]);
            }

            return response()->json(['success' => false, 'message' => 'Paiement non valide.'], 400);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Recruteur sees current subscription status
     */
    public function mySubscription()
    {
        $recruteur = Auth::user();
        $days = 0;
        if ($recruteur->is_premium && $recruteur->premium_expires_at) {
            $days = Carbon::now()->diffInDays(Carbon::parse($recruteur->premium_expires_at), false);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'is_premium' => (bool) $recruteur->is_premium,
                'expires_at' => $recruteur->premium_expires_at,
                'days_remaining' => $days > 0 ? (int) $days : 0
            ]
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
            $event = \Stripe\Webhook::constructEvent(
                $payload, $sig_header, $endpoint_secret
            );
        } catch(\UnexpectedValueException $e) {
            return response()->json(['error' => 'Invalid payload'], 400);
        } catch(\Stripe\Exception\SignatureVerificationException $e) {
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
                        'premium_expires_at' => $expiresAt
                    ]);

                    Payment::firstOrCreate([
                        'stripe_payment_id' => $paymentIntent->id
                    ], [
                        'recruteur_id' => $user->id,
                        'amount' => $paymentIntent->amount / 100,
                        'package_type' => $package,
                        'status' => 'succeeded'
                    ]);
                }
            }
        }

        return response()->json(['status' => 'success'], 200);
    }
}
