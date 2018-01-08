import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { OAuthModule } from 'angular-oauth2-oidc';

import { RoutingModule } from './routing.module';
import { SharedModule } from './shared/shared.module';

import { UserService } from './services/user.service';
import { AuthService } from './services/auth.service';
import { AppComponent } from './app.component';
import { NotFoundComponent } from './not-found/not-found.component';

import { MaterialDesignModule } from './material-design.module';
import { YesNoDialogComponent } from './dialogs/yes-no-dialog/yes-no-dialog.component';
import { BusyOverlayComponent } from './busy-overlay/busy-overlay.component';
import { ChooseInvitationDialogComponent } from './dialogs/choose-invitation-dialog/choose-invitation-dialog.component';

import { NotificationService } from './services/notification.service';

import { ResearchModule } from './research.module';
import { TextInputDialogComponent } from './dialogs/text-input-dialog/text-input-dialog.component';

@NgModule({
  declarations: [
    AppComponent,
    NotFoundComponent,
    YesNoDialogComponent,
    TextInputDialogComponent,
    BusyOverlayComponent,
  ],
  imports: [
    OAuthModule.forRoot(),
    RoutingModule,
    SharedModule,
    BrowserModule,
    BrowserAnimationsModule,
    MaterialDesignModule,
    ResearchModule,
  ],
  providers: [
    NotificationService, 
    /*AuthService,
    CatService,
    UserService*/
  ],
  entryComponents: [
    YesNoDialogComponent,
    TextInputDialogComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent]
})

export class AppModule { }
