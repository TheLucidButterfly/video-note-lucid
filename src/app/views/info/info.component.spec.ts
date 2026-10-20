import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { StorageService } from 'src/app/services/storage-service.service';
import { LoadingNotificationService } from 'src/app/services/loading-notification/loading-notification.service';
import { VideoUploadService } from 'src/app/services/video-upload.service';

import { InfoComponent } from './info.component';

describe('InfoComponent', () => {
  let component: InfoComponent;
  let fixture: ComponentFixture<InfoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [InfoComponent],
      providers: [
        { provide: StorageService, useValue: { getUserData: () => of({}), getSavedPaths: () => of([]) } },
        { provide: LoadingNotificationService, useValue: { show: () => {}, hide: () => {}, loading$: of(false) } },
        { provide: VideoUploadService, useValue: { selectVideoAndPersist: async () => null } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
    fixture = TestBed.createComponent(InfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
