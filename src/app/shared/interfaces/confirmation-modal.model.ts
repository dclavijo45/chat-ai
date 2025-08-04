/**
 * This model defines the structure of the data used in the confirmation modal.
 */
export type ConfirmationModalData = {
    /**
     * The title of the confirmation modal.
     */
    title: string;

    /**
     * The message displayed in the confirmation modal.
     */
    message: string;

    /**
     * The text for the confirm button.
     */
    confirmButtonText: string;

    /**
     * The text for the cancel button.
     */
    cancelButtonText: string;
}
