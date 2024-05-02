import { AppComponent } from './app/app.component';
import { appConfig } from './app/config/app.config';
import { bootstrapApplication } from '@angular/platform-browser';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
