<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Assuming middleware 'isRecruteur' handles authorization
    }

    public function rules(): array
    {
        return [
            'package_type' => 'required|string|in:monthly,yearly'
        ];
    }
}
