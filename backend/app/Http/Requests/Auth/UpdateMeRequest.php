<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'ville' => 'sometimes|nullable|string|max:255',
            'experience' => 'sometimes|nullable|string|max:255',
            'poste_recherche' => 'sometimes|nullable|string|max:255',
            'nom_etablissement' => 'sometimes|nullable|string|max:255',
            'type_etablissement' => 'sometimes|nullable|in:cafe,hotel,restaurant',
            'cv' => 'sometimes|file|mimes:pdf|max:2048',
            'photo' => 'sometimes|image|mimes:jpeg,jpg,png|max:2048',
        ];
    }
}
