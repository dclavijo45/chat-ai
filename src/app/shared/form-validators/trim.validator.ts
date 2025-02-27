import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

/**
 * @description A validator function that checks if the value is trimmed
 */
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
