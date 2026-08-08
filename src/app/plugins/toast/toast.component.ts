import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css']
})
export class ToastComponent implements OnChanges, OnDestroy {
  @Input() isVisible = false;
  @Input() message = 'Saved';
  @Input() durationMs = 3000;
  @Output() dismissed = new EventEmitter<void>();

  private hideTimeoutId: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && this.isVisible) {
      this.scheduleDismiss();
    }
  }

  ngOnDestroy(): void {
    this.clearScheduledDismiss();
  }

  dismiss(): void {
    this.clearScheduledDismiss();
    this.dismissed.emit();
  }

  private scheduleDismiss(): void {
    this.clearScheduledDismiss();
    this.hideTimeoutId = setTimeout(() => {
      this.dismissed.emit();
      this.hideTimeoutId = null;
    }, Math.max(500, this.durationMs || 3000));
  }

  private clearScheduledDismiss(): void {
    if (this.hideTimeoutId) {
      clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = null;
    }
  }
}
