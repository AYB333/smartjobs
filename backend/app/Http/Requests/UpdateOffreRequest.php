<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOffreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'titre_poste' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'ville' => 'sometimes|string|max:255',
            'salaire' => 'nullable|numeric|min:0',
            'type_contrat' => 'sometimes|in:CDI,CDD,Extra,Saisonnier',
            'duree_validite' => 'sometimes|in:7,15,30',
            'status' => 'sometimes|in:active,expired,suspended',
        ];
    }
}
