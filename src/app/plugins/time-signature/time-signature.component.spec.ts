import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TimeSignatureComponent } from './time-signature.component';
import { VideoComponent } from 'src/app/views/video/video.component';
import { RouterTestingModule } from '@angular/router/testing';
import { StorageService } from 'src/app/services/storage-service.service';
import { LoadingNotificationService } from 'src/app/services/loading-notification/loading-notification.service';
import { of } from 'rxjs';

describe('TimeSignatureComponent', () => {
  let component: TimeSignatureComponent;
  let fixture: ComponentFixture<TimeSignatureComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [TimeSignatureComponent],
      providers: [
        VideoComponent,
        { provide: StorageService, useValue: { getVideos: () => of([]), saveNotesToVideoObject: () => {} } },
        { provide: LoadingNotificationService, useValue: { show: () => {}, hide: () => {}, loading$: of(false) } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
    fixture = TestBed.createComponent(TimeSignatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
