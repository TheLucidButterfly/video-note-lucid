import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InfoComponent } from './views/info/info.component';
import { HomeViewComponent } from './views/home-view/home-view.component';
import { VideoComponent } from './views/video/video.component';
import { DeveloperToolsComponent } from './views/developer-tools/developer-tools.component';
import { SettingsComponent } from './views/settings/settings.component';
// import { VideoTextViewComponent } from './views/video-text-view/video-text-view.component';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'video', component: VideoComponent },
  // URL parsing route intentionally disabled for legal/compliance reasons.
  // { path: 'video-text', component: VideoTextViewComponent },
  { path: 'info', component: InfoComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'uploader', redirectTo: '/info', pathMatch: 'full' },
  { path: 'home', component: HomeViewComponent },
  { path: 'developer-tools', component: DeveloperToolsComponent},
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  declarations: [],
  imports: [
    RouterModule.forRoot(routes)
  ],
  exports: [RouterModule,]
})
export class AppRoutingModule { }

