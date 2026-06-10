<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class IsRecruteur
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! Auth::check() || Auth::user()->role !== 'recruteur') {
            return response()->json(['message' => 'Unauthorized. Recruteur access required.'], 403);
        }

        return $next($request);
    }
}
