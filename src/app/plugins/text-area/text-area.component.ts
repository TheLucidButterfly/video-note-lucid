import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { TimeSignatureObject } from 'src/app/interfaces/time-signature-object.interface';

@Component({
  selector: 'app-text-area',
  templateUrl: './text-area.component.html',
  styleUrls: ['./text-area.component.css']
})
export class TextAreaComponent {
  private readonly notePreviewMaxLength = 72;

  @Input('selectedSignatureObject') selectedSignatureObject: any;
  @Input('notesArray') notesArray: TimeSignatureObject[] = [];
  @Output() updateCurrentTimeEmit = new EventEmitter();
  @Output() updateCurrentText = new EventEmitter();
  @Output() changeSelectedTime = new EventEmitter();
  @Output() noteDirty = new EventEmitter<string>();
  @Input() dirtyKeys: Set<string> = new Set();
  @Input() currentTime?: any;
  @Input() api?: any;

  timeSignatureArray: TimeSignatureObject[] = [];

  page = 0;

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes && !changes['selectedSignatureObject']) {
      // Handle ticks
      this.updateCurrentTimeEmit.emit(this.currentTime | 0);
      this.updateCurrentText.emit(
        typeof this.selectedSignatureObject?.notes === 'string'
          ? this.selectedSignatureObject.notes
          : ''
      );
    }
  }

  handleChangedText(event: any) {
    this.updateCurrentText.emit(event?.target?.value || '');
    this.noteDirty.emit(this.selectedSignatureObject?.timeSignature ?? '');
  }

  noteExists() {
    return typeof this.selectedSignatureObject?.notes === 'string';
  }

  selectTime(selectedTimeObject: any) {
    this.changeSelectedTime.emit(selectedTimeObject);
  }

  focusTextArea() {
    if (this.api.state === 'playing') {
      this.api.pause();
    }
  }

  getNotePreview(note: string | null | undefined): string {
    const normalized = (note || '').replace(/\s+/g, ' ').trim();

    if (!normalized) {
      return '(empty)';
    }

    if (normalized.length <= this.notePreviewMaxLength) {
      return normalized;
    }

    return `${normalized.slice(0, this.notePreviewMaxLength).trimEnd()}...`;
  }

}
