import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export function TrimValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;

        if (!value) {
            return null;
        }

        if (value?.toString()?.trim() != value?.toString()) {
            return { trim: true };
        }

        return null;
    };
}
