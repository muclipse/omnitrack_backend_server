import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResearchMainComponent } from './research-main/research-main.component';
import { ResearchLoginComponent } from './research-login/research-login.component';
import { ResearchSignupComponent } from './research-signup/research-signup.component';
import { ResearchFrameComponent } from './research-frame/research-frame.component';
import { ResearcherAuthService } from './services/researcher.auth.service';
import { ResearchDashboardComponent } from './research-dashboard/research-dashboard.component';
import { ResearcherAuthGuardSecure } from './services/researcher.auth.guard.secure';
import { ResearcherAuthGuardMain } from './services/researcher.auth.guard.main';
import { ResearchApiService } from './services/research-api.service';
import { ExperimentOverviewComponent } from './experiment-overview/experiment-overview.component';
import { ExperimentParticipantsComponent } from './experiment-participants/experiment-participants.component';
import { ExperimentGroupsComponent } from './experiment-groups/experiment-groups.component';
import { ExperimentOmniTrackComponent } from './experiment-omnitrack/experiment-omnitrack.component';
import { ExperimentInvitationsComponent } from './experiment-invitations/experiment-invitations.component';
import { ExperimentSettingsComponent } from './experiment-settings/experiment-settings.component';
import { ExperimentDataComponent } from './experiment-data/experiment-data.component';
import { OmniTrackPackageListComponent } from './research/omnitrack/omnitrack-package-list.component';
import { OmniTrackPackageEditComponent } from './research/omnitrack/omnitrack-package-edit.component';
import { NewInvitationDialogComponent } from './experiment-invitations/new-invitation-dialog/new-invitation-dialog.component';
import { ChooseInvitationDialogComponent } from './dialogs/choose-invitation-dialog/choose-invitation-dialog.component';
import { ExperimentMessagingComponent } from './experiment-messaging/experiment-messaging.component';
import { ComposeMessageComponent } from './experiment-messaging/compose-message/compose-message.component';
import { AnonymizeEmailPipe } from './pipes/anonymize-email.pipe';
import { SocketService } from './services/socket.service';
import { RoutingModule } from './routing.module';
import { SharedModule } from './shared/shared.module';
import { MaterialDesignModule } from './material-design.module';
import { ClipboardModule } from 'ngx-clipboard';
import { ResearcherPermissionsConfigurationComponent } from './experiment-settings/researcher-permissions-configuration/researcher-permissions-configuration.component';
import { ResearcherSearchComponentComponent } from './experiment-settings/researcher-search-component/researcher-search-component.component';
import { AddCollaboratorDialogComponent } from './experiment-settings/add-collaborator-dialog/add-collaborator-dialog.component';
import { ResearchLayoutComponent } from './layouts/research-layout/research-layout.component';
import { ResearchHomeFrameComponent } from './research-home-frame/research-home-frame.component';
import { ExperimentListComponent } from './experiment-list/experiment-list.component';
import { ResearcherAccountSettingsComponent } from './researcher-account-settings/researcher-account-settings.component';
import { EngagementComponent } from './research/visualization/engagement/engagement.component';
import { EngagementTimelineContainerDirective } from './research/visualization/engagement/engagement-timeline-container.directive';
import { SVGEllipsisDirective } from './directives/svgellipsis.directive';
import { NouisliderModule, NouisliderComponent } from 'ng2-nouislider';
import { NewExperimentDialogComponent } from './experiment-list/new-experiment-dialog/new-experiment-dialog.component';
import { EngagementParticipantGroupDirective } from './research/visualization/engagement/engagement-participant-group.directive';
import { DeleteExperimentConfirmDialogComponent } from './dialogs/delete-experiment-confirm-dialog/delete-experiment-confirm-dialog.component';
import { FroalaEditorModule, FroalaViewModule } from 'angular-froala-wysiwyg';
import { TableCellValueComponent } from './components/table-cell-value/table-cell-value.component';
import { ServerSettingsComponent } from './server-settings/server-settings.component';
import { UploadClientBinaryDialogComponent } from './server-settings/upload-client-binary-dialog/upload-client-binary-dialog.component';
import { ImageCellComponent } from './experiment-data/image-cell/image-cell.component';
import { PerParticipantVisualizationDashboardComponent } from './research/visualization/per-participant-visualization-dashboard/per-participant-visualization-dashboard.component';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    RoutingModule,
    ClipboardModule,
    NouisliderModule,
    FroalaEditorModule.forRoot(),
    FroalaViewModule.forRoot()
  ],
  declarations: [

    ResearchMainComponent,
    ResearchLoginComponent,
    ResearchSignupComponent,
    ResearchFrameComponent,
    ResearchDashboardComponent,
    ExperimentOverviewComponent,
    ExperimentParticipantsComponent,
    ExperimentGroupsComponent,
    ExperimentOmniTrackComponent,
    ExperimentInvitationsComponent,
    ExperimentSettingsComponent,
    ExperimentDataComponent,
    OmniTrackPackageListComponent,
    OmniTrackPackageEditComponent,
    NewInvitationDialogComponent,
    ChooseInvitationDialogComponent,
    ExperimentMessagingComponent,
    ComposeMessageComponent,
    AnonymizeEmailPipe,
    ResearcherPermissionsConfigurationComponent,
    ResearcherSearchComponentComponent,
    AddCollaboratorDialogComponent,
    ResearchLayoutComponent,
    ResearchHomeFrameComponent,
    ExperimentListComponent,
    ResearcherAccountSettingsComponent,
    EngagementComponent,
    EngagementTimelineContainerDirective,
    SVGEllipsisDirective,
    NewExperimentDialogComponent,
    EngagementParticipantGroupDirective,
    DeleteExperimentConfirmDialogComponent,
    ServerSettingsComponent,
    UploadClientBinaryDialogComponent,
    ImageCellComponent,
    PerParticipantVisualizationDashboardComponent
  ],
  exports: [
    NouisliderModule,
    ResearchMainComponent,
    ResearchLoginComponent,
    ResearchSignupComponent,
    ResearchFrameComponent,
    ResearchDashboardComponent,
    ExperimentOverviewComponent,
    ExperimentParticipantsComponent,
    ExperimentGroupsComponent,
    ExperimentOmniTrackComponent,
    ExperimentInvitationsComponent,
    ExperimentSettingsComponent,
    ExperimentDataComponent,
    OmniTrackPackageListComponent,
    OmniTrackPackageEditComponent,
    NewInvitationDialogComponent,
    ChooseInvitationDialogComponent,
    ExperimentMessagingComponent,
    ComposeMessageComponent,
    AnonymizeEmailPipe,
    ResearchLayoutComponent,
    ResearchHomeFrameComponent,
    ResearcherAccountSettingsComponent
  ],
  providers: [
    ResearcherAuthGuardSecure,
    ResearcherAuthGuardMain,
    ResearcherAuthService,
    SocketService,
    ResearchApiService
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  entryComponents: [
    ChooseInvitationDialogComponent,
    NewInvitationDialogComponent,
    AddCollaboratorDialogComponent,
    NewExperimentDialogComponent,
    DeleteExperimentConfirmDialogComponent,
    UploadClientBinaryDialogComponent
  ]
})
export class ResearchModule { }
