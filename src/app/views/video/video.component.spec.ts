import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { VideoComponent } from './video.component';
import { StorageService } from 'src/app/services/storage-service.service';
import { LoadingNotificationService } from 'src/app/services/loading-notification/loading-notification.service';
import { of } from 'rxjs';

describe('VideoComponent', () => {
  let component: VideoComponent;
  let fixture: ComponentFixture<VideoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [VideoComponent],
      providers: [
        { provide: StorageService, useValue: { getVideos: () => of([]), saveNotesToVideoObject: () => {} } },
        { provide: LoadingNotificationService, useValue: { show: () => {}, hide: () => {}, loading$: of(false) } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
    fixture = TestBed.createComponent(VideoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sortNotesObject sorts by numeric timeSignature', () => {
    const notes = [
      { timeSignature: '30', notes: 'b' },
      { timeSignature: '5', notes: 'a' },
      { timeSignature: '120', notes: 'c' }
    ];
    const sorted = component.sortNotesObject(notes);
    expect(sorted.map(n => n.timeSignature)).toEqual(['5', '30', '120']);
  });
});
