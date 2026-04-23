<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOffreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; 
    }

    public function rules(): array
    {
        return [
            "titre_poste" => "required|string|max:255",
            "description" => "required|string",
            "ville" => "required|string|max:255",
            "salaire" => "nullable|numeric|min:0",
            "type_contrat" => "required|in:CDI,CDD,Extra,Saisonnier",
            "duree_validite" => "required|in:7,15,30",
        ];
    }
}
