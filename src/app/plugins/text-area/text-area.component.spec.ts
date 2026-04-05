import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { TextAreaComponent } from './text-area.component';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { MinutesFormatPipe } from 'src/app/pipes/minutes-format.pipe';

describe('TextAreaComponent', () => {
  let component: TextAreaComponent;
  let fixture: ComponentFixture<TextAreaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TextAreaComponent, MinutesFormatPipe],
      imports: [FormsModule, NgxPaginationModule]
    });
    fixture = TestBed.createComponent(TextAreaComponent);
    component = fixture.componentInstance;
    component.selectedSignatureObject = { timeSignature: '30', notes: '' };
    component.notesArray = [];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('handleChangedText emits noteDirty with the current timeSignature', () => {
    const emitted: string[] = [];
    component.noteDirty.subscribe((key: string) => emitted.push(key));
    component.handleChangedText({ target: { value: 'hello' } });
    expect(emitted).toEqual(['30']);
  });

  it('handleChangedText emits updateCurrentText with the typed value', () => {
    const emitted: string[] = [];
    component.updateCurrentText.subscribe((v: string) => emitted.push(v));
    component.handleChangedText({ target: { value: 'typed text' } });
    expect(emitted).toEqual(['typed text']);
  });

  it('ngOnChanges on time tick does NOT emit noteDirty', () => {
    const emitted: string[] = [];
    component.noteDirty.subscribe((key: string) => emitted.push(key));
    component.currentTime = 5;
    component.ngOnChanges({
      currentTime: new SimpleChange(0, 5, false)
    });
    expect(emitted.length).toBe(0);
  });

  it('getNotePreview truncates long notes', () => {
    const long = 'a'.repeat(100);
    const result = component.getNotePreview(long);
    expect(result.endsWith('...')).toBeTrue();
    expect(result.length).toBeLessThanOrEqual(75);
  });

  it('getNotePreview returns (empty) for blank notes', () => {
    expect(component.getNotePreview('')).toBe('(empty)');
    expect(component.getNotePreview(null)).toBe('(empty)');
  });
});
