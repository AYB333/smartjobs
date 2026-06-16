<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|string|in:candidat,recruteur',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Le nom complet est requis.',
            'email.required' => 'L email est requis.',
            'email.email' => 'Entrez une adresse email valide.',
            'email.unique' => 'Cet email est deja utilise.',
            'password.required' => 'Le mot de passe est requis.',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caracteres.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
            'role.required' => 'Choisissez un type de compte.',
            'role.in' => 'Le type de compte choisi est invalide.',
        ];
    }
}
