import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { NotFoundComponent } from './not-found/not-found.component';

import { ResearchSignupComponent } from './research-signup/research-signup.component';
import { ResearchLoginComponent } from './research-login/research-login.component';
import { ResearchFrameComponent } from './research-frame/research-frame.component';
import { ResearcherAuthGuardMain } from './services/researcher.auth.guard.main';
import { ResearchDashboardComponent } from './research-dashboard/research-dashboard.component';
import { ResearcherAuthGuardSecure } from './services/researcher.auth.guard.secure';
import { ExperimentOverviewComponent } from './experiment-overview/experiment-overview.component';
import { ExperimentDataComponent } from './experiment-data/experiment-data.component';
import { ExperimentParticipantsComponent } from './experiment-participants/experiment-participants.component';
import { ExperimentGroupsComponent } from './experiment-groups/experiment-groups.component';
import { ExperimentOmniTrackComponent } from './experiment-omnitrack/experiment-omnitrack.component';
import { ExperimentInvitationsComponent } from './experiment-invitations/experiment-invitations.component';
import { ExperimentSettingsComponent } from './experiment-settings/experiment-settings.component';
import { OmniTrackPackageListComponent } from './research/omnitrack/omnitrack-package-list.component';
import { OmniTrackPackageEditComponent } from './research/omnitrack/omnitrack-package-edit.component';
import { ExperimentMessagingComponent } from './experiment-messaging/experiment-messaging.component';
import { ComposeMessageComponent } from './experiment-messaging/compose-message/compose-message.component';
import { ResearchHomeFrameComponent } from './research-home-frame/research-home-frame.component';
import { ExperimentListComponent } from './experiment-list/experiment-list.component';
import { ResearcherAccountSettingsComponent } from './researcher-account-settings/researcher-account-settings.component';
import { ServerSettingsComponent } from './server-settings/server-settings.component';
import { PerParticipantVisualizationDashboardComponent } from './research/visualization/per-participant-visualization-dashboard/per-participant-visualization-dashboard.component';
import { ExperimentCustomStatisticsComponent } from './experiment-custom-statistics/experiment-custom-statistics.component';
import { ExperimentTrackingEngagementComponent } from './experiment-overview/experiment-tracking-engagement/experiment-tracking-engagement.component';
import { ClientUsageComponent } from './experiment-overview/client-usage/client-usage.component';
import { ServerStatusOverviewComponent } from './server-status-overview/server-status-overview.component';
import { HttpMethodTestingComponent } from './test/http-method-testing/http-method-testing.component';
import { InstallationWizardComponent } from './installation/installation-wizard/installation-wizard.component';
import { PreventReinstallationGuard } from './services/prevent-reinstallation.guard';
import { OmniTrackPackageCodeEditorComponent } from './research/omnitrack/omni-track-package-code-editor/omni-track-package-code-editor.component';
import { ExperimentConsentEditorComponent } from './experiment-consent-editor/experiment-consent-editor.component';
import { ExperimentClientSettingsComponent } from './experiment-client-settings/experiment-client-settings.component';
import { ExperimentConsentComponent } from './experiment-consent/experiment-consent.component';
import { DemographicEditorComponent } from './experiment-consent/demographic-editor/demographic-editor.component';
import { CheckInstallationGuard } from './services/check-installation.guard';
import { ExperimentTrackingEntityStatusComponent } from './experiment-tracking-entity-status/experiment-tracking-entity-status.component';

const routes: Routes = [
  { path: '', redirectTo: 'research', pathMatch: 'full' },

  { path: 'test', component: HttpMethodTestingComponent },

  { path: 'install', component: InstallationWizardComponent, canActivate: [PreventReinstallationGuard] },
  /*
    {
      path: 'tracking', component: EndUserFrameComponent,
      children: [
        {
          path: '', component: EndUserHomeComponent, canActivate: [EndUserAuthCheckGuard], data: { title: "OmniTrack" },
          children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', component: EndUserDashboardComponent },
            { path: 'trackers', component: EndUserTrackerListComponent },
            { path: 'triggers', component: EndUserTriggerListComponent }
          ]
        },
        { path: 'login', component: EndUserSignInComponent, canActivate: [EndUserAuthToMainGuard], data: { title: "Login" } }
      ]
    },*/

  {
    path: 'research', component: ResearchFrameComponent,
    canActivate: [CheckInstallationGuard],
    children: [
      {
        path: '', component: ResearchHomeFrameComponent,
        children: [
          { path: '', redirectTo: 'status', pathMatch: 'full' },
          { path: 'status', component: ServerStatusOverviewComponent, canActivate: [ResearcherAuthGuardSecure] },
          { path: 'settings', component: ServerSettingsComponent, canActivate: [ResearcherAuthGuardSecure] },
          { path: 'signup', component: ResearchSignupComponent },
          { path: 'login', component: ResearchLoginComponent },
          { path: 'experiments', component: ExperimentListComponent, canActivate: [ResearcherAuthGuardSecure] },
          { path: 'account', component: ResearcherAccountSettingsComponent, canActivate: [ResearcherAuthGuardSecure] }
        ]
      },
      { path: 'dashboard', component: ResearchDashboardComponent, canActivate: [ResearcherAuthGuardSecure] },
      {
        path: 'dashboard/:experimentId', component: ResearchDashboardComponent, canActivate: [ResearcherAuthGuardSecure],
        children: [
          { path: '', redirectTo: 'overview', pathMatch: "full" },
          {
            path: 'overview', component: ExperimentOverviewComponent, data: { title: 'Overview', showTitleBar: false },
            children: [
              { path: '', redirectTo: 'tracking', pathMatch: 'full' },
              { path: 'tracking', component: ExperimentTrackingEngagementComponent },
              { path: 'usage', component: ClientUsageComponent }

            ]
          },
          { path: 'messaging', component: ExperimentMessagingComponent, data: { title: "Messaging" } },
          { path: 'messaging/new', component: ComposeMessageComponent, data: { title: "Compose Message", backTitle: "Messaging", backNavigationUrl: './messaging' } },
          { path: 'tracking-data', component: ExperimentDataComponent, data: { title: 'Captured Items' } },
          {
            path: 'entity-status', component: ExperimentTrackingEntityStatusComponent, data: { title: 'Tracking Entity Status' }
          },
          { path: 'participants', component: ExperimentParticipantsComponent, data: { title: 'Participants' } },
          { path: 'groups', component: ExperimentGroupsComponent, data: { title: 'Groups' } },
          { path: 'invitations', component: ExperimentInvitationsComponent, data: { title: 'Invitations' } },
          { path: 'client-apps', component: ExperimentClientSettingsComponent, data: { title: 'Client Apps' } },
          { path: 'settings', component: ExperimentSettingsComponent, data: { title: 'Settings' } },
          { path: 'consent', component: ExperimentConsentComponent, data: { title: 'Configure Informed Consent' } },
          {
            path: 'consent/edit', component: ExperimentConsentEditorComponent, data: {
              title: 'Edit Consent Form',
              backTitle: "Experiment Settings",
              backNavigationUrl: "./consent"
            }
          },
          {
            path: 'consent/demographic', component: DemographicEditorComponent, data: {
              title: 'Edit Demographic Questionnaires',
              backTitle: "Informed Consent Configuration",
              backNavigationUrl: './consent'
            }
          },
          {
            path: 'omnitrack', component: ExperimentOmniTrackComponent, data: { title: 'OmniTrack' },
            children: [
              { path: '', redirectTo: 'packages', pathMatch: 'full' },
              { path: 'packages', component: OmniTrackPackageListComponent, data: { title: "OmniTrack Packages" } },
              {
                path: 'packages/:packageKey', component: OmniTrackPackageCodeEditorComponent, data: {
                  title: "Edit Tracking Package Code",
                  backTitle: "Package List", backNavigationUrl: './omnitrack/packages'
                }
              }
            ]
          },

        ]
      }
    ]
  },

  { path: 'notfound', component: NotFoundComponent },
  { path: '**', redirectTo: '/notfound' },
];



@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})

export class RoutingModule { }
