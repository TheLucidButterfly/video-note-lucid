import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { StorageService } from 'src/app/services/storage-service.service';
import { LoadingNotificationService } from 'src/app/services/loading-notification/loading-notification.service';
import { VideoUploadService } from 'src/app/services/video-upload.service';
import { FileNameFromPathPipe } from 'src/app/pipes/file-name-from-path.pipe';

import { HomeViewComponent } from './home-view.component';

describe('HomeViewComponent', () => {
  let component: HomeViewComponent;
  let fixture: ComponentFixture<HomeViewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, NgxPaginationModule],
      declarations: [HomeViewComponent, FileNameFromPathPipe],
      providers: [
        { provide: StorageService, useValue: { getSavedPaths: () => of([]) } },
        { provide: LoadingNotificationService, useValue: { show: () => {}, hide: () => {}, loading$: of(false) } },
        { provide: VideoUploadService, useValue: { selectVideoAndPersist: async () => null, persistVideoPaths: async () => null } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
    fixture = TestBed.createComponent(HomeViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
