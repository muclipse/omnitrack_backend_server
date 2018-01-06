import * as mongoose from 'mongoose';
import OTUser from '../models/ot_user';
import OTTracker from '../models/ot_tracker';
import OTTrigger from '../models/ot_trigger';
import OTItem from '../models/ot_item';
import OTResearcher from '../models/ot_researcher';
import OTExperiment from '../models/ot_experiment';
import OTInvitation from '../models/ot_invitation';
import OTParticipant from '../models/ot_participant';
import { AInvitation } from '../../omnitrack/core/research/invitation';

import { IJoinedExperimentInfo } from '../../omnitrack/core/research/experiment';
import app from '../app';
import C from '../server_consts'
import { SocketConstants } from '../../omnitrack/core/research/socket'
import { Document } from 'mongoose';

export default class ResearchModule {
  sendInvitationToUser(invitationCode: string, userId: string, force: boolean): PromiseLike<{ invitationAlreadySent: boolean, participant: any }> {
    return this.getInvitationIdFromCode(invitationCode).then(
      invitationId => OTParticipant.findOne({ user: userId, "invitation.code": invitationCode }).then(participantDoc => {
        let sendAgain = false
        let reject = false
        if (participantDoc) {
          if (force === true) {
            reject = false
            sendAgain = true
          } else {
            reject = true
            sendAgain = false
          }
        }

        if (reject === true) {
          return { invitationAlreadySent: true, participant: participantDoc }
        } else {
          return this.makeParticipantInstanceFromInvitation(invitationCode, userId).then(document => document.save().then(doc => {

            app.socketModule().sendUpdateNotificationToExperimentSubscribers(doc["experiment"], {model: SocketConstants.MODEL_PARTICIPANT, event: SocketConstants.EVENT_INVITED, payload: {participant: doc}})

            // TODO send push notification to user
            return { invitationAlreadySent: sendAgain, participant: doc }
          })
          )
        }
      })
    )
  }

  getInvitationIdFromCode(invitationCode: string): Promise<string> {
    return OTInvitation.findOne({ code: invitationCode }, { _id: 1 }).then(invitation => invitation._id).catch(err => {
      console.log(err)
      return err
    })
  }

  makeParticipantInstanceFromInvitation(invitationCode: string, userId: string): Promise<Document> {
    return OTInvitation.findOne({ code: invitationCode }).then(
      invitation => {
        const typedInvitation = AInvitation.fromJson((invitation as any).groupMechanism)
        const groupId = typedInvitation.pickGroup()
        return new OTParticipant({
          user: userId,
          invitation: mongoose.Types.ObjectId(invitation._id),
          experiment: invitation["experiment"],
          groupId: groupId
        })
      })
  }

  removeParticipant(participantId): Promise<any> {
    return OTParticipant.findOneAndRemove({ _id: participantId }).then(removedParticipant => {
      const part = (removedParticipant as any)

      app.socketModule().sendUpdateNotificationToExperimentSubscribers(part.experiment, {model: SocketConstants.MODEL_PARTICIPANT, event: SocketConstants.EVENT_REMOVED, payload: {participant: part}})

      if (!part.isDenied && !part.isConsentApproved) {
        // TODO remove push notification to user
      }
      return part
    })
  }

  private dropOutImpl(search: any, reason?: string, researcherId?: string): Promise<{success: boolean, injectionExists?: boolean, error?: string, experiment?: IJoinedExperimentInfo}> {
    const droppedDate = new Date()
    search.dropped = {$ne: true}
    console.log(search)
    return OTParticipant.findOneAndUpdate(search, {
      dropped: true,
      droppedBy: researcherId,
      droppedReason: reason,
      droppedAt: new Date()
    }, {new: true}).populate({path: "experiment", select: "_id name"}).then(participant => {
      console.log(participant)
      if (participant) {
        const experiment = participant["experiment"]
        //TODO remove trackers, triggers, items, and medias associated with the experiment
        return Promise.all([OTTracker, OTTrigger].map(model => {
          return model.update({
            "flags.injected": true,
            "flags.experiment": experiment._id
          }, { removed: true }, { multi: true }).then(res => {
            if (res.ok === 1) {
              return { changed: res.n > 0, syncType: C.getSyncTypeFromModel(model), changeCount: res.n }
            }
            else return { changed: false, syncType: C.getSyncTypeFromModel(model) }
          })
        })).then(objRemovalResult => {
          console.log(objRemovalResult)
          const changedResults = objRemovalResult.filter(r => r.changed == true)
          if (changedResults.length > 0) {
            app.serverModule().registerMessageDataPush(participant["user"], app.pushModule().makeSyncMessageFromTypes(
              changedResults.map(r => r.syncType)
            ))
          }

          app.socketModule().sendUpdateNotificationToExperimentSubscribers(experiment._id, {model: SocketConstants.MODEL_PARTICIPANT, event: SocketConstants.EVENT_DROPPED, payload: {participant: participant}})

          return {success: true, experiment:{id: experiment._id.toString(), name: experiment.name.toString(), injectionExists: changedResults.length > 0, joinedAt: participant["approvedAt"].getTime(), droppedAt: droppedDate.getTime()}}
        })
      }
      return {success: false, injectionExists: false, error: "Not participating in the experiment.", experiment: null}
    })
  }

  dropOutFromExperiment(userId: string, experimentId: string, reason?: string, researcherId?: string): Promise<any> {
    return this.dropOutImpl({ "user": userId, experiment: experimentId }, reason, researcherId)
  }

  dropParticipant(participantId: string, reason?: string, researcherId?: string): Promise<any> {
    return this.dropOutImpl({ _id: participantId }, reason, researcherId)
  }

  /**
   * Handles the participation process after the user approved the invitation.
   * @param userId
   * @param invitationCode
   */
  handleInvitationApproval(userId: string, invitationCode: string): Promise<{ success: boolean, error?: String, injectionExists?: boolean, experiment?: IJoinedExperimentInfo }> {
    const joinedDate = new Date()
    // find participant information
    return OTInvitation.findOne({ code: invitationCode }, { _id: 1, experiment: 1 })
      .then(invitation => {
        if (!invitation) {
          return { success: false, error: "Could not find such invitation code.", injectionExists: null, experiment: null }
        }

        return OTParticipant.find({ "user": userId, "experiment": invitation["experiment"], isConsentApproved: true, dropped: {$ne: true} }).then(participants => {
          if (participants.length > 0) {
            console.log("duplicate experiment participation. skip the approval process.")
            // already approved the invitation.
            return { success: false, error: "Already participating in this experiment.", injectionExists: null, experiment: null }
          }
          else {
            return OTParticipant.findOneAndUpdate({ "user": userId, "invitation": invitation._id }, {
              isDenied: false,
              isConsentApproved: true,
              approvedAt: joinedDate,
              dropped: false,
              droppedAt: null,
              droppedBy: null
            }, {new: true}).populate("experiment").then(changedParticipant => {
              console.log("changed participant: ")
              console.log(changedParticipant)
              if (changedParticipant == null) {
                console.log("No participant. this is the intentional participation. Add new participant instance.")
                return this.makeParticipantInstanceFromInvitation(invitationCode, userId).then(newParticipant => {
                  newParticipant["isDenied"] = false
                  newParticipant["isConsentApproved"] = true
                  newParticipant["approvedAt"] = joinedDate
                  return newParticipant.save().then(participant => {
                    return participant.populate("experiment").execPopulate()
                  })
                })
              }
              else return changedParticipant
            }).then(changedParticipant => {
              if (changedParticipant) {
                const groupId = changedParticipant["groupId"]
                const experiment = changedParticipant["experiment"]
                const experimentInfo: IJoinedExperimentInfo = { id: experiment._id.toString(), name: experiment.name.toString(), joinedAt: joinedDate.getTime() }
                const group = experiment.groups.find(g => g._id === groupId)
                if (group && group.trackingPackageKey) {
                  const trackingPackage = (experiment.trackingPackages || []).find(p => p.key === group.trackingPackageKey)
                  if (trackingPackage) {
                    console.log("inject trackingPackage '" + trackingPackage.name + "' to user " + userId)

                    return app.omnitrackModule().injectPackage(userId, trackingPackage.data, {
                      injected: true,
                      experiment: experiment._id
                    }).then(res => {
                      return { success: true, injectionExists: true, experiment: experimentInfo }
                    })
                  } else {
                    return Promise.reject("The group contains trackingPackage which does not exist in the experiment.")
                  }
                } else { return { success: true, injectionExists: false, experiment: experimentInfo } }
              } else {
                return Promise.reject("The invitation is no longer available.")
              }
            }).then(result => {
              if(result.success==true)
              {
                app.socketModule().sendUpdateNotificationToExperimentSubscribers(result.experiment.id, {model: SocketConstants.MODEL_PARTICIPANT, event: SocketConstants.EVENT_APPROVED, payload: result})
              }
              return result
            })
          }
        })
      })
  }


}