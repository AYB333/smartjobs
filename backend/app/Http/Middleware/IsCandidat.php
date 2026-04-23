<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class IsCandidat
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!Auth::check() || Auth::user()->role !== 'candidat') {
            return response()->json(['message' => 'Unauthorized. Candidat access required.'], 403);
        }
        return $next($request);
    }
}
