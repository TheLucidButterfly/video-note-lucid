import { Injectable } from '@angular/core';
import { get, set } from 'idb-keyval';
import { Observable, of, from, switchMap, map, take } from 'rxjs';
import { UtilityService } from './utility.service';
import { NgxFileDropEntry } from 'ngx-file-drop';
import { SavedVideo } from '../interfaces/saved-video.interface';
import { TimeSignatureObject } from '../interfaces/time-signature-object.interface';
import { LoadingNotificationService } from './loading-notification/loading-notification.service';
import { UserData } from '../interfaces/user-data.interface';
import { SavedPathsMock } from 'src/mocks/savedPaths/saved-paths.mock';
import { Note, PathNotes } from '../interfaces/video-paths.interface';


@Injectable({
  providedIn: 'root'
})
export class StorageService {

  private readonly fallbackStoragePrefix = 'videonotes_fallback_';

  constructor(
    private utilityService: UtilityService,
    private loadingService: LoadingNotificationService) {
    // set('userData',JSON.stringify({videoLengthUsed:0, videoStorageUsed:0}))
  }

  public getVideos(): Observable<PathNotes[]> {
    return from(this.safeGet('videoPaths').then((savedVideos: any) => {
      if (savedVideos) {
        return JSON.parse(savedVideos)
      }
      else {
        this.clearAllVideos();
      }
    }));
  }

  /**
   * Helper function that returns all video paths
   * @Compatability Electron
   * @returns 
   * 
   */
  public getVideoPaths(): Observable<any[]> {
    return from(this.safeGet('videoPaths').then((savedVideoPaths: any) => {
      if (savedVideoPaths) {
        return JSON.parse(savedVideoPaths)
      }
      else {
        // Legacy
        // this.clearAllVideos();

        // Modern
        this.clearAllVideoPaths();
      }
    }));
  }

  /** 
   * Returns all(superset) of the users data from storage
   * @Compatability Browser & Electron
  */
  public getUserData() {
    return from(this.safeGet('userData').then(userData => userData ? JSON.parse(userData) : {}))
  }

  public getSavedPaths() {
    return from(this.safeGet('videoPaths').then(paths => {return paths ? JSON.parse(paths) :  undefined}))
  }

  public getAppSettings() {
    return from(this.safeGet('appSettings').then(settings => settings ? JSON.parse(settings) : {}));
  }

  public saveAppSettings(settings: any) {
    const normalizedSettings = settings && typeof settings === 'object' ? settings : {};
    return from(this.safeSet('appSettings', JSON.stringify(normalizedSettings)).then(() => normalizedSettings));
  }

  /**
   * Set the localstorage initial values for saved-video method
   * @Compatability Browser & Electron
   */
  public clearAllVideos() {
    this.safeSet('videos', '[]')
    this.safeSet('userData', '{}')
  }

  /**
   * Set the localstorage initial values for saved-paths method
   * @Compatability Electron only
   */
  public clearAllVideoPaths() {
    this.safeSet('videoPaths', '[]') // set('videoPaths', JSON.stringify(SavedPathsMock))
    this.safeSet('userData', '{}')
  }

  /**
   * 
   * @Compatability Browser & Electron
   * @param extractedVideoArray 
   * @returns 
   */
  private saveExtractedVideos(extractedVideoArray: SavedVideo[]): Observable<any> {
    // this.clearAllVideos()
    return from(this.safeGet('videos')
      .then((savedVideos: any) => {
        // TODO: clean this up
        if (!savedVideos) {
          savedVideos = new Array()
        }
        try {
          savedVideos = JSON.parse(savedVideos)
        } catch (error) {

        }
        let tempList: SavedVideo[] = new Array()
        tempList = savedVideos.concat(extractedVideoArray)
        return this.safeSet('videos', JSON.stringify(tempList))
          .then(() => {
            return tempList
          })
      }
      ))
  }

  /**
   * 
   * @param extractedVideoPathArray 
   * @Compatability Electron only
   * @returns Observable<any>
   */
  saveExtractedVideoPaths(extractedVideoPathArray: SavedVideo[]): Observable<any> {
    return from(this.safeGet('videoPaths')
      .then((savedVideoPaths: any) => {
        // TODO: clean this up
        if (!savedVideoPaths) {
          savedVideoPaths = new Array();
        }
        try {
          savedVideoPaths = JSON.parse(savedVideoPaths)
        } catch (error) {

        }
        let tempList: SavedVideo[] = new Array()
        tempList = savedVideoPaths.concat(extractedVideoPathArray);

        return this.safeSet('videoPaths', JSON.stringify(tempList))
          .then(() => {
            return tempList;
          })
      }
      ))
  }


  deleteVideoPathAtIndex(index: number){
    return from(this.safeGet('videoPaths')
      .then((savedVideoPaths: any) => {
        const parsedPaths = savedVideoPaths ? JSON.parse(savedVideoPaths) : [];

        if (!Array.isArray(parsedPaths) || index < 0 || index >= parsedPaths.length) {
          return parsedPaths;
        }

        const updatedPaths = [...parsedPaths];
        updatedPaths.splice(index, 1);

        return this.safeSet('videoPaths', JSON.stringify(updatedPaths))
          .then(() => {
            this.loadingService.hide();
            return updatedPaths;
          })
      }
      ))
  }

  saveNotesToVideoObject(index: number, notesArray: TimeSignatureObject[], showLoading = true) {
    if (showLoading) {
      this.loadingService.show('Saving');
    }

    this.getVideos().subscribe((videos: PathNotes[]) => {
      videos[index].notes = notesArray;
      this.updateVideoObject(videos).subscribe(() => {
        if (showLoading) {
          this.loadingService.hide();
        }
      });
    })
  }

  getNotes(index:number):Observable<Note[]> {
    return this.getVideos().pipe(
      take(1),
      map(videos => videos[index].notes)
    )
  }

  private updateVideoObject(videos: PathNotes[]) {
    return from(this.safeSet('videoPaths', JSON.stringify(videos))
      .then(() => {
        // setting completed
        return of(videos)
      }))
  }

  // DEV_ONLY: This method is intended for development purposes to replace the entire video paths array with a new one. Use with caution. 
  replaceVideoPaths(paths: PathNotes[]) {
    const normalized = Array.isArray(paths) ? paths : [];
    return from(this.safeSet('videoPaths', JSON.stringify(normalized)).then(() => normalized));
  }

  saveUploadedVideo(videoList: NgxFileDropEntry[]): Observable<any[]> {
    return from(this.utilityService.extractVideoResources(videoList))
      .pipe(
        switchMap((extractedVideoArray: SavedVideo[]) => {
          return this.saveExtractedVideos(extractedVideoArray)
        })
      )
  }

  /**
   * 
   * @compatability Browser & Electron
   */
  saveUploadedVideoPath(videoPathList: NgxFileDropEntry[]) {
    return from(this.utilityService.extractVideoResources(videoPathList))
    // .pipe(
    //   switchMap((extractedVideoArray: SavedVideo[]) => {
    //     return this.saveExtractedVideos(extractedVideoArray)
    //   })
    // )
  }

  
  saveUserData(userFileSizes: any[]) {
    let memoryBytesToAdd = userFileSizes.reduce((accumulator, file) => accumulator + file.size, 0);
    this.getUserData().subscribe(
      (userData: UserData) => {
        this.safeSet('userData', JSON.stringify({ videoLengthUsed: (userData.videoLengthUsed | 0) + (userFileSizes.length + 0), videoStorageUsed: (userData.videoStorageUsed | 0) + (memoryBytesToAdd | 0) }))
      }
    )
  }

  private getFallbackStorageKey(key: string): string {
    return `${this.fallbackStoragePrefix}${key}`;
  }

  private useFallbackStorage(error: any): boolean {
    const errorMessage = String(error?.message || error || '');
    return errorMessage.toLowerCase().includes('internal error opening backing store');
  }

  private async safeGet(key: string): Promise<any> {
    const fallbackValue = localStorage.getItem(this.getFallbackStorageKey(key));

    try {
      const idbValue = await get(key);
      if (idbValue === null || typeof idbValue === 'undefined') {
        return fallbackValue;
      }
      return idbValue;
    } catch (error) {
      if (this.useFallbackStorage(error)) {
        return fallbackValue;
      }
      throw error;
    }
  }

  private async safeSet(key: string, value: string): Promise<void> {
    localStorage.setItem(this.getFallbackStorageKey(key), value);

    try {
      await set(key, value);
    } catch (error) {
      if (this.useFallbackStorage(error)) {
        return;
      }
      throw error;
    }
  }

  // saveUserData_Paths(userFileSizes: any[]){
  //   let memoryBytesToAdd = userFileSizes.reduce((accumulator, file) => accumulator + file.size, 0);
  //   this.getUserData().subscribe(
  //     (userData: UserData) => {
  //       set('userData', JSON.stringify({ videoLengthUsed: (userData.videoLengthUsed | 0) + (userFileSizes.length + 0), videoStorageUsed: (userData.videoStorageUsed | 0) + (memoryBytesToAdd | 0) }))
  //     }
  //   )
  // }

  loadPremiumStatus(): Observable<any>{
      // Call the exposed Electron API function
      return from(
        (window as any).premiumAPI.loadPremiumStatus()
        .then((result: any) => result)
        .catch((error: any) => {
          console.error('LOG: Error invoking loadPremiumStatus:', error);
        })
      )
  }

}
