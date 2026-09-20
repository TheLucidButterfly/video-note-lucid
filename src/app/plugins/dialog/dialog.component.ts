// notes-limit-dialog.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivationResponse } from 'src/app/interfaces/activation-response.interface';
import { EntitlementService } from 'src/app/services/entitlement.service';

@Component({
  selector: 'app-dialog',
  templateUrl:'./dialog.component.html',
  styleUrls: ['./dialog.component.css']
})
export class DialogComponent {
  @Input() currentView: 'limitExceeded' | 'activateForm' | 'confirm' = 'limitExceeded'; // Determines the current view
  @Input() titleText = 'Are you sure?';
  @Input() messageText = '';
  @Input() confirmText = 'Yes';
  @Input() cancelText = 'No';
  @Input() stayText = 'Stay';
  @Input() showStay = false;
  @Output() dialogOpen = new EventEmitter();
  @Output() confirmed = new EventEmitter<boolean>();
  @Output() stayed = new EventEmitter<void>();
  
  isDialogVisible: boolean = true;
  showActivateForm: boolean = false;
  activationCode: string = '';
  activationError: string | null = null;

  constructor(private entitlementService: EntitlementService) {}

  ngOnInit() {
    if (this.currentView === 'activateForm') {
      this.showActivateForm = true;
    }
  }

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

  stayHere() {
    this.stayed.emit();
  }

  redirectToBuy() {
    this.entitlementService.openCheckoutPage();
  }

  openActivateForm() {
    this.showActivateForm = true;
  }

  async validateKey() {
    this.activationError = null;
    const activationResponse: ActivationResponse = await this.entitlementService.activateLicense(this.activationCode);
    if (activationResponse.success) {
      this.closeDialog();
      return;
    }

    this.activationError = activationResponse.message;
  }
}
