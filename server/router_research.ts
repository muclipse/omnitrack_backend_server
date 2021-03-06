import { IEnvironment } from './env';
import { OTResearchAuthCtrl } from './controllers/research/ot_research_auth_controller';
import OTResearchCtrl from './controllers/research/ot_research_controller';
import { experimentCtrl } from './controllers/research/ot_experiment_controller';
import { messageCtrl } from './controllers/research/ot_message_controller';
import { clientBinaryCtrl } from './controllers/research/ot_client_binary_controller';
import { OTUsageLogCtrl } from './controllers/ot_usage_log_controller';
import { userCtrl } from './controllers/ot_user_controller';
import ot_tracker from './models/ot_tracker';
import ot_trigger from './models/ot_trigger';
import ot_item from './models/ot_item';
import { trackingDataCtrl } from './controllers/research/ot_tracking_data_controller';
import { ResearcherPrevilages } from '../omnitrack/core/research/researcher';
import BinaryStorageCtrl from './controllers/binary_storage_controller';
import { itemCtrl } from './controllers/ot_item_controller';
import { participantCtrl } from './controllers/research/ot_participant_controller';
import { clientSignatureCtrl } from './controllers/ot_client_signature_controller';
import { RouterWrapper } from './server_utils';
import { trackingPackageCtrl } from './controllers/ot_tracking_package_controller';
import { clientBuildCtrl } from './controllers/research/ot_client_build_controller';
import OTShortUrl from './models/ot_short_url';
import { experimentDataCtrl } from './controllers/research/ot_experiment_data_controller';

export class ResearchRouter extends RouterWrapper {

  private readonly researchCtrl = new OTResearchCtrl()
  private readonly storageCtrl = new BinaryStorageCtrl()
  private readonly usageLogCtrl = new OTUsageLogCtrl()
  private readonly researchAuthCtrl = new OTResearchAuthCtrl()

  constructor(env: IEnvironment) {
    super()

    const tokenApprovedAuth = this.researchAuthCtrl.makeTokenAuthMiddleware((researcher) => {
      switch (researcher["account_approved"]) {
        case true: return null;
        case false: return "AccountDeclined";
        case undefined: return "AccountApprovalPending"
      }
    })

    const tokenAdminAuth = this.researchAuthCtrl.makeTokenAuthMiddleware((researcher) => {
      const previlage = (env.super_users as Array<string> || []).indexOf(researcher.email) !== -1 ? ResearcherPrevilages.SUPERUSER : ResearcherPrevilages.NORMAL

      return previlage >= ResearcherPrevilages.ADMIN ? null : "NotAdmin"
    })

    const tokenSignedInAuth = this.researchAuthCtrl.makeTokenAuthMiddleware()

    /*
    router.post('/oauth/authorize', oauth.authorize())
    router.post('/oauth/token', oauth.token())
    */

    this.router.post('/auth/authenticate', this.researchAuthCtrl.authenticate)
    this.router.post('/auth/register', this.researchAuthCtrl.register)
    this.router.post('/auth/update', tokenApprovedAuth, this.researchAuthCtrl.update)
    this.router.post('/auth/verify', tokenSignedInAuth, this.researchAuthCtrl.verifyToken)

    // Admin API===================================================

    this.router.get('/researchers/all', tokenAdminAuth, this.researchCtrl.getResearchers)
    this.router.post('/researchers/:researcherId/approve', tokenAdminAuth, this.researchCtrl.setResearcherAccountApproved)
    // =============================================================
    this.router.post("/shorten", tokenApprovedAuth, (req, res) => {
      if (req.body.longUrl) {
        OTShortUrl.findOneAndUpdate({
          longUrl: req.body.longUrl
        }, {}, { upsert: true, setDefaultsOnInsert: true, new: true })
          .lean<any>().then(doc => {
            res.status(200).send(doc.shortId)
          })
      } else {
        res.status(400).send("No LongUrl sent in body.")
      }
    })

    this.router.get("/experiments/examples", this.researchCtrl.getExampleExperimentList)
    this.router.post("/experiments/examples", tokenApprovedAuth, this.researchCtrl.addExampleExperiment)

    this.router.post('/experiments/new', tokenApprovedAuth, experimentCtrl.createExperiment)
    this.router.get('/experiments/all', tokenApprovedAuth, experimentCtrl.getExperimentInformationsOfResearcher)
    this.router.get('/experiments/:experimentId', tokenApprovedAuth, experimentCtrl.getExperiment)

    this.router.post('/experiments/:experimentId/update', tokenApprovedAuth, experimentCtrl.updateExperiment)

    this.router.post('/experiments/:experimentId/messages/new', tokenApprovedAuth, messageCtrl.enqueueMessage)
    this.router.get('/experiments/:experimentId/messages', tokenApprovedAuth, messageCtrl.getMessageList)

    this.router.post('/experiments/:experimentId/update', tokenApprovedAuth, experimentCtrl.updateExperiment)

    this.router.delete('/experiments/:experimentId', tokenApprovedAuth, experimentCtrl.removeExperiment)
    this.router.post('/experiments/:experimentId/delete', tokenApprovedAuth, experimentCtrl.removeExperiment)

    this.router.get('/experiments/:experimentId/export', tokenApprovedAuth, experimentDataCtrl.getExperimentDataPacked)


    this.router.post("/experiments/:experimentId/collaborators/new", tokenApprovedAuth, experimentCtrl.addCollaborator)

    this.router.post("/experiments/:experimentId/collaborators/:collaboratorId/delete", tokenApprovedAuth, experimentCtrl.removeCollaborator)

    this.router.delete("/experiments/:experimentId/collaborators/:collaboratorId", tokenApprovedAuth, experimentCtrl.removeCollaborator)

    this.router.post("/experiments/:experimentId/collaborators/update", tokenApprovedAuth, experimentCtrl.updateCollaboratorPermissions)

    this.router.get('/experiments/manager/:experimentId', tokenApprovedAuth, experimentCtrl.getManagerInfo)

    this.router.get('/experiments/:experimentId/invitations', tokenApprovedAuth, experimentCtrl.getInvitations)

    this.router.get('/experiments/:experimentId/participants', tokenApprovedAuth, experimentCtrl.getParticipants)

    this.router.post('/experiments/:experimentId/participants/create', tokenApprovedAuth, userCtrl.register)

    this.router.get('/experiments/:experimentId/session/summary', tokenApprovedAuth, experimentCtrl.getSessionSummary)

    this.router.post('/experiments/:experimentId/invitations/new', tokenApprovedAuth, experimentCtrl.addNewIntivation)

    this.router.delete('/experiments/:experimentId/invitations/:invitationId', tokenApprovedAuth, experimentCtrl.removeInvitation)
    this.router.post('/experiments/:experimentId/invitations/:invitationId/delete', tokenApprovedAuth, experimentCtrl.removeInvitation)

    this.router.post('/experiments/:experimentId/finish', tokenApprovedAuth, experimentCtrl.setFinishDateOnExperiment)

    //tracking package API===========================
    this.router.post('/experiments/:experimentId/packages/update', tokenApprovedAuth, experimentCtrl.updateTrackingPackageToExperiment)

    this.router.delete('/experiments/:experimentId/packages/:packageKey', tokenApprovedAuth, experimentCtrl.removeTrackingPackageFromExperiment)
    this.router.post('/experiments/:experimentId/packages/:packageKey/delete', tokenApprovedAuth, experimentCtrl.removeTrackingPackageFromExperiment)

    this.router.get('/package/temporary/:code', tokenApprovedAuth, trackingPackageCtrl.getTemporaryTrackingPackageWithCode)
    //===============================================


    this.router.post('/experiments/:experimentId/groups/upsert', tokenApprovedAuth, experimentCtrl.upsertExperimentGroup)
    this.router.delete('/experiments/:experimentId/groups/:groupId', tokenApprovedAuth, experimentCtrl.removeExperimentGroup)
    this.router.post('/experiments/:experimentId/groups/:groupId/delete', tokenApprovedAuth, experimentCtrl.removeExperimentGroup)

    // client build ================================================================
    this.router.get('/build/configs/all/:experimentId?', tokenApprovedAuth,
      clientBuildCtrl.getClientBuildConfigs)
      this.router.post('/build/configs/initialize', tokenApprovedAuth,
        clientBuildCtrl.initializeDefaultPlatformConfig)
    this.router.post('/build/configs/update/:experimentId?', tokenApprovedAuth,
      clientBuildCtrl.updateClientBuildConfigs)

    this.router.get("/build/configs/:configId/validate_signature", tokenApprovedAuth, clientBuildCtrl.validateJavaKeystore)


    this.router.post('/build/start', tokenApprovedAuth, clientBuildCtrl.startBuild)
    this.router.post('/build/cancel', tokenApprovedAuth, clientBuildCtrl.cancelBuild)
    this.router.get('/build/status', tokenApprovedAuth,
      clientBuildCtrl.getBuildStatus)

    this.router.post('/build/generate_keystore', tokenApprovedAuth, clientBuildCtrl.generateJavaKeystore)

    this.router.post('/build/download_source', tokenApprovedAuth, clientBuildCtrl.downloadBuildableSourceCode)

    // ==============================================================================

    this.router.post('/users/notify/message', tokenApprovedAuth, experimentCtrl.sendNotificationMessageToUser)

    this.router.delete('/participants/:participantId', tokenApprovedAuth, userCtrl.deleteAccount)
    this.router.post('/participants/:participantId/delete', tokenApprovedAuth, userCtrl.deleteAccount)

    this.router.post('/participants/:participantId/alias', tokenApprovedAuth, experimentCtrl.changeParticipantAlias)

    this.router.post('/participants/:participantId/issue_reset_password', tokenApprovedAuth, userCtrl.issuePasswordResetToken)

    this.router.get("/researchers/search", tokenApprovedAuth, this.researchCtrl.searchResearchers)

    this.router.delete("/users/:userId", tokenApprovedAuth, userCtrl.deleteAccount)
    this.router.post("/users/:userId/delete", tokenApprovedAuth, userCtrl.deleteAccount)


    this.router.post("/participants/:participantId/drop", tokenApprovedAuth, experimentCtrl.dropOutFromExperiment)


    this.router.post('/participants/:participantId/excluded_days', tokenApprovedAuth, participantCtrl.postExcludedDays)

    this.router.post('/participants/:participantId/ping_full_sync', tokenApprovedAuth, participantCtrl.sendSyncMessageToClients)


    // tracking data

    new Array(
      { url: "trackers", model: ot_tracker },
      { url: "triggers", model: ot_trigger },
      { url: "items", model: ot_item }
    ).forEach(
      info => {
        this.router.get('/experiments/:experimentId/data/' + info.url, tokenApprovedAuth, trackingDataCtrl.getChildrenOfExperiment(info.model))
      }
    )

    this.router.get('/experiments/:experimentId/entities/user/:userId', tokenApprovedAuth, trackingDataCtrl.getEntitiesOfUserInExperiment)

    this.router.post('/experiments/:experimentId/test/trigger_ping', tokenApprovedAuth, experimentCtrl.sendTriggerPingTest)

    this.router.get('/files/item_media/:trackerId/:itemId/:fieldLocalId/:fileIdentifier/:processingType?', tokenApprovedAuth, this.storageCtrl.downloadItemMedia)

    // data manipulation
    this.router.post("/tracking/update/item_column", tokenApprovedAuth, itemCtrl.postItemValue)
    this.router.post("/tracking/update/item_timestamp", tokenApprovedAuth, itemCtrl.postItemTimestamp)
    this.router.post('/tracking/update/trigger', tokenApprovedAuth, trackingDataCtrl.updateTriggerOfExperiment)
    this.router.post('/tracking/update/tracker', tokenApprovedAuth, trackingDataCtrl.updateTrackerOfExperiment)
    this.router.post('/tracking/update/field', tokenApprovedAuth, trackingDataCtrl.updateFieldOfTrackerOfExperiment)


    this.router.get("/users/all", tokenApprovedAuth, experimentCtrl.getUsersWithPariticipantInformation)

    this.router.post('/clients/upload', tokenApprovedAuth, clientBinaryCtrl.postClientBinaryFile)
    this.router.delete("/clients/:binaryId", tokenApprovedAuth, clientBinaryCtrl.removeClientBinary)
    this.router.post("/clients/:binaryId/delete", tokenApprovedAuth, clientBinaryCtrl.removeClientBinary)
    this.router.post('/clients/:binaryId/publish', tokenApprovedAuth, clientBinaryCtrl.publishClientBinary)


    this.router.get('/signatures/all', tokenApprovedAuth, clientSignatureCtrl.getSignatures)
    this.router.post('/signatures/update', tokenApprovedAuth, clientSignatureCtrl.postSignature)
    this.router.delete('/signatures/:id', tokenApprovedAuth, clientSignatureCtrl.removeSignature)
    this.router.post('/signatures/:id/delete', tokenApprovedAuth, clientSignatureCtrl.removeSignature)


    this.router.get('/diagnostics/logs/usage', tokenApprovedAuth, this.usageLogCtrl.getFilteredUserGroupedUsageLogs)
    this.router.get('/diagnostics/logs/error', tokenAdminAuth, this.usageLogCtrl.getErrorLogs)

    // debuging
//    this.router.get("/debug/generate_participant_alias", this.researchCtrl.generateAliasOfParticipants)
//    this.router.get('/debug/push_command', experimentCtrl.sendPushCommand)
//    this.router.get("/debug/migrate_experiment/:userId/to/:experimentId", experimentCtrl.migrateUserTrackingEntitiesToExperiment)

    const methodTestHandler = (req, res) => {
      res.status(200).send(true)
    }

    this.router.get('/debug/test_http_method/get', methodTestHandler)
    this.router.post('/debug/test_http_method/post', methodTestHandler)
    this.router.put('/debug/test_http_method/put', methodTestHandler)
    this.router.delete('/debug/test_http_method/delete', methodTestHandler)
    this.router.options('/debug/test_http_method/options', methodTestHandler)
  }
}
