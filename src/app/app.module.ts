import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeViewComponent } from './views/home-view/home-view.component';
import { NgxFileDropModule } from 'ngx-file-drop';
import { InfoComponent } from './views/info/info.component';
import { VideoComponent } from './views/video/video.component';
import { VgCoreModule } from '@videogular/ngx-videogular/core';
import { VgControlsModule } from '@videogular/ngx-videogular/controls';
import { VgOverlayPlayModule } from '@videogular/ngx-videogular/overlay-play';
import { VgBufferingModule } from '@videogular/ngx-videogular/buffering';
import { SpinnerComponent } from './services/loading-notification/spinner/spinner.component';
import { TimeSignatureComponent } from './plugins/time-signature/time-signature.component';
import { TextAreaComponent } from './plugins/text-area/text-area.component';
import { TextFieldModule } from '@angular/cdk/text-field';
import { FormsModule } from '@angular/forms';
import { MinutesFormatPipe } from './pipes/minutes-format.pipe';
import { NgxPaginationModule } from 'ngx-pagination';
import { DeveloperToolsComponent } from './views/developer-tools/developer-tools.component';
import { FileNameFromPathPipe } from './pipes/file-name-from-path.pipe';
import { DialogComponent } from './plugins/dialog/dialog.component'; // <-- import the module
import { ToastComponent } from './plugins/toast/toast.component';
import { SettingsComponent } from './views/settings/settings.component';
// import { VideoTextViewComponent } from './views/video-text-view/video-text-view.component';


@NgModule({
  declarations: [
    AppComponent,
    HomeViewComponent,
    InfoComponent,
    VideoComponent,
    SpinnerComponent,
    TimeSignatureComponent,
    TextAreaComponent,
    MinutesFormatPipe,
    DeveloperToolsComponent,
    FileNameFromPathPipe,
    DialogComponent,
    ToastComponent,
    SettingsComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    NgxFileDropModule,
    VgCoreModule,
    VgControlsModule,
    VgOverlayPlayModule,
    VgBufferingModule,
    TextFieldModule,
    FormsModule,
    NgxPaginationModule
  ],
  providers: [],
  bootstrap: [AppComponent],
  exports: [NgxFileDropModule]
})
export class AppModule { }
