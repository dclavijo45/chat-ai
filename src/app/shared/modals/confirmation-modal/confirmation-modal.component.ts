import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogRef } from '@ngneat/dialog';
import { ConfirmationModalData } from '../../interfaces/confirmation-modal.model';

@Component({
    templateUrl: './confirmation-modal.component.html',
    styleUrl: './confirmation-modal.component.scss',
    selector: 'confirmation-modal',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationModalComponent {
    ref: DialogRef<ConfirmationModalData, boolean> = inject(DialogRef);
}
