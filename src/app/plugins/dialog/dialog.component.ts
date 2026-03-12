// notes-limit-dialog.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivationResponse } from 'src/app/interfaces/activation-response.interface';

@Component({
  selector: 'app-notes-limit-dialog',
  templateUrl:'./dialog.component.html',
  styleUrls: ['./dialog.component.css']
})
export class NotesLimitDialogComponent {
  @Input() currentView: 'limitExceeded' | 'activateForm' | 'confirm' = 'limitExceeded'; // Determines the current view
  @Input() titleText = 'Are you sure?';
  @Input() messageText = '';
  @Input() confirmText = 'Yes';
  @Input() cancelText = 'No';
  @Output() dialogOpen = new EventEmitter();
  @Output() confirmed = new EventEmitter<boolean>();
  
  isDialogVisible: boolean = true;
  showActivateForm: boolean = false;
  activationCode: string = '';
  activationError: string | null = null;

  closeDialog() {
    this.isDialogVisible = false;
    this.dialogOpen.emit(false);
  }

  confirmYes() {
    this.confirmed.emit(true);
    this.closeDialog();
  }

  confirmNo() {
    this.confirmed.emit(false);
    this.closeDialog();
  }

  redirectToBuy() {
    window.open('https://your-site.com/upgrade', '_blank');
  }

  openActivateForm() {
    this.showActivateForm = true;
  }

  validateKey() {
    (window as any).license.activateKey(this.activationCode).then((activationResponse: ActivationResponse) => {
      console.log(activationResponse)
      if (activationResponse.success) {
        this.closeDialog()
        console.log('License is valid!');
      } else {
        alert('Error validating key:'+activationResponse.message);
      }
    });
  }
}
