import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgxFileDropEntry, FileSystemFileEntry } from 'ngx-file-drop';
import { StorageService } from '../../services/storage-service.service';
import { finalize } from 'rxjs';
import { LoadingNotificationService } from 'src/app/services/loading-notification/loading-notification.service';
import { UserData } from 'src/app/interfaces/user-data.interface';
import { environment, uploadModes } from 'src/environments/environment';
import { VideoUploadService } from 'src/app/services/video-upload.service';
// import { FileDialogService } from 'src/app/services/file-dialog.service';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.css']
})

export class InfoComponent {

  droppedVideoList: NgxFileDropEntry[] = [];
  userData!: UserData;
  loading = false;
  roomForVideos = true;

  byteLimit = 100000;
  fileLengthLimit = 5;

  pendingFiles: any[] = [];
  pendingFilesMetadata: any[] = [];
  totalPendingBytes = 0;

  uploadedFileNames: string[] = []
  savedFileCount = 0;
  savedNoteCount = 0;

  constructor(
    private router: Router,
    private storageService: StorageService,
    private loader: LoadingNotificationService,
    private videoUploadService: VideoUploadService) { }

  ngOnInit(): void {
    this.isLoading(false);
    this.loadInfoPageData();
  }

  private loadInfoPageData() {
    this.setUserData();
    this.storageService.getSavedPaths().subscribe(paths => {
      const savedPaths = paths ?? [];
      this.savedFileCount = savedPaths.length;
      this.savedNoteCount = savedPaths.reduce((accumulator: number, savedPath: any) => {
        return accumulator + (savedPath?.notes?.length || 0);
      }, 0);
    });
  }

  // Electron dialog
  async selectVideo() {
    const uploadResult = await this.videoUploadService.selectVideoAndPersist();
    if (!uploadResult) {
      return;
    }

    this.uploadedFileNames = uploadResult.selectedFileNames;
    this.router.navigate(['video'], { queryParams: { index: uploadResult.firstNewPathIndex } });
  }

  /*
  Legacy uploader flow kept for reference:

  selectVideo() {
    const electronApi = (window as any)?.electron;
    if (!electronApi?.ipcRenderer?.invoke) return;

    electronApi.ipcRenderer.invoke('openDialog').then((filePaths: string[]) => {
      if (!filePaths?.length) return;

      this.uploadedFileNames = this.getUploadedFileNamesList(filePaths);
      const newUploadCount = filePaths.length;
      this.storageService
        .saveExtractedVideoPaths(this.createPathObject(filePaths) as any)
        .subscribe((savedPaths: any[]) => {
          const firstNewPathIndex = Math.max(0, (savedPaths?.length || 0) - newUploadCount);
          this.router.navigate(['video'], { queryParams: { index: firstNewPathIndex } });
        });
    });
  }
  */

  private setUserData() {
    this.storageService.getUserData().subscribe(
      (userData: UserData) => {
        this.userData = userData;
      }
    )
  }

  // TODO: rewrite to audit global files
  auditPendingVideos() {
    if ((this.userData?.videoLengthUsed as any) < this.fileLengthLimit
      ||
      (this.userData?.videoStorageUsed as any) < this.byteLimit
    ) {
      // alert('no room!')
      this.roomForVideos = false;
    }
  }

  removeVideFromPending(index: number) {
    this.pendingFiles = this.pendingFiles.filter((file, fileIndex) => fileIndex != index);
    this.pendingFilesMetadata = this.pendingFilesMetadata.filter((file, fileIndex) => fileIndex != index);
    this.auditPendingVideos();
  }

  removeAllPending() {
    this.pendingFiles = [];
    this.pendingFilesMetadata = [];
    this.resetPendingVariables();
  }

  resetPendingVariables() {
    this.totalPendingBytes = 0;
  }

  /**
   * Step 1 in file journey.
   * @param droppedFiles 
   */
  dropped(droppedFiles: NgxFileDropEntry[]) {
    if (environment.uploadMode == uploadModes.pathed) {
      this.pendingFiles = [];
      this.pendingFiles = droppedFiles.map((file:any) => {
        if (file.fileEntry.isFile) {
          return file?.fileEntry?.fullPath 
        }
      });
      // droppedFiles.forEach(async file => {
      //   let analyzedFile = await this.analyzeFileData(file);
      //   this.pendingFilesMetadata.push(analyzedFile)
      // })
    } else if (environment.uploadMode == uploadModes.saved) {
      this.pendingFiles = [];
      this.pendingFiles = droppedFiles;
      droppedFiles.forEach(async file => {
        let analyzedFile = await this.analyzeFileData(file);
        this.pendingFilesMetadata.push(analyzedFile)
      })
    }

    this.auditPendingVideos()
  }

  // TODO: use this to get file size and type
  analyzeFileData(file: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const fileEntry = file.fileEntry as FileSystemFileEntry;
      fileEntry.file((file: File) => {
        let tempFile = {} as any;
        tempFile['type'] = this.massageFileType(file)
        tempFile['size'] = file.size;
        this.totalPendingBytes = this.totalPendingBytes + (tempFile['size'] | 0);
        resolve(tempFile)
      })
    })
  }

  massageFileType(file: any) {
    let fileType = file.type;
    if (!fileType) {
      fileType = file.name.split('.').pop();
    }
    if (!fileType) {
      fileType = 'Uknown'
    }
    return fileType;
  }

  savePendingFiles() {
    if (environment.uploadMode == uploadModes.pathed) {
      this.saveByPath();
    } else if (environment.uploadMode == uploadModes.saved) {
      this.saveToStorage();
      this.storageService.saveUserData(this.pendingFilesMetadata)
      // this.storageService.saveUploadedVideo(this.pendingFiles)
    }
  }

  saveByPath() {
    this.isLoading(true);
    this.storageService.saveUserData(this.pendingFilesMetadata);
  }

  saveToStorage() {
    this.isLoading(true)
    this.storageService.saveUserData(this.pendingFilesMetadata)
    this.storageService.saveUploadedVideo(this.pendingFiles)
      .subscribe(res => {
        this.isLoading(false);
        this.pendingFiles.forEach((file, index) => { this.removeAllPending(); this.setUserData(); })
      })
  }

  //TODO: Fill in the below functions
  fileOver(idkYet: any) {

  }
  //TODO: Fill in the below functions
  fileLeave(idkYet: any) {

  }

  navigateHome() {
    this.router.navigate(['/home']);
  }

  isLoading(loading: boolean) {
    if (loading) {
      this.loading = true;
      this.loader.show();
    } else {
      this.loading = false;
      this.loader.hide();
    }
  }
}
