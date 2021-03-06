import * as fs from 'fs-extra';
import * as path from 'path';
import { ModelConverter } from '../../omnitrack/core/model_converter'
import ServerModule from './server.module';
import PushModule from './push.module';
import { TrackingPlan } from '../../omnitrack/core/tracking-plan'
import OTTracker from '../models/ot_tracker'
import OTTrigger from '../models/ot_trigger'
import IdGenerator from '../../omnitrack/core/id_generator'
import C from '../server_consts';
import { merge } from '../../shared_lib/utils';
import SocketModule from './socket.module';
import { TrackingPlanManagerImpl } from '../../omnitrack/core/tracking-plan-helper';
import { DependencyLevel, OmniTrackFlagGraph } from '../../omnitrack/core/functionality-locks/omnitrack-dependency-graph';
import { TriggerConstants } from '../../omnitrack/core/trigger/trigger-constants';
import OTUser from '../models/ot_user';
import { ITrackerDbEntity, ITriggerDbEntity, IFieldDbEntity, IUserDbEntity, IDescriptionPanelDbEntity } from '../../omnitrack/core/db-entity-types';
import OTItem from '../models/ot_item';
import OTItemMedia from '../models/ot_item_media';
import FieldManager from '../../omnitrack/core/fields/field.manager';

export default class OmniTrackModule {

  public readonly serverModule: ServerModule
  public readonly pushModule: PushModule
  public readonly socketModule: SocketModule

  constructor(app: any) {
    this.serverModule = new ServerModule()
    this.pushModule = new PushModule()
    this.socketModule = new SocketModule(app.get("io"))
  }

  bootstrap() {
    this.serverModule.bootstrap()
    this.socketModule.bootstrap()
  }

  async injectPackage(user: IUserDbEntity, trackingPlan: TrackingPlan, creationFlags?: any): Promise<void> {
    const pack: TrackingPlan = JSON.parse(JSON.stringify(trackingPlan))
    const planManager = new TrackingPlanManagerImpl(pack)

    let appFlags
    if (pack.app != null && pack.app.lockedProperties != null) {
      appFlags = pack.app.lockedProperties
    } else {
      appFlags = OmniTrackFlagGraph.generateFlagWithDefault(DependencyLevel.App)
    }

    user.appFlags = appFlags

    const userTrackers: Array<ITrackerDbEntity> = await OTTracker.find({ user: user._id, "flags.injected": true }).lean<any>()
    const userTriggers: Array<ITriggerDbEntity> = await OTTrigger.find({ user: user._id, "flags.injected": true }).lean<any>()


    //find user trackers to remove
    const userTrackersToRemove = userTrackers.filter(t => pack.trackers.findIndex(pt => pt.flags.injectedId === t.flags.injectedId) === -1)
    const memberTrackerQuery = { tracker: { $in: userTrackersToRemove.map(t => t._id) } }

    const userTriggersToRemove = userTriggers.filter(t => pack.triggers.findIndex(pt => pt.flags.injectedId === t.flags.injectedId) === -1)

    if (userTrackersToRemove.length > 0) {
      await OTTracker.deleteMany({ _id: { $in: userTrackersToRemove.map(t => t._id) } })
      await OTItem.deleteMany(memberTrackerQuery)
      await OTItemMedia.find(memberTrackerQuery).then(itemMediaList =>
        Promise.all(itemMediaList.map(m => {
          const location = this.serverModule.makeItemMediaFileDirectoryPath(m["user"], m["tracker"], m["item"])
          fs.remove(location)
        })))
      await OTItemMedia.deleteMany(memberTrackerQuery)
    }

    if (userTriggersToRemove.length > 0) {
      await OTTrigger.deleteMany({ _id: { $in: userTriggersToRemove.map(t => t._id) } })
    }

    if (userTrackersToRemove.length > 0) {
      await OTTrigger.updateMany({}, { $pull: { trackers: { $in: userTrackersToRemove.map(t => t._id) } } })
    }

    pack.trackers.forEach(tracker => {
      tracker.fields.forEach(attr => {
        attr.lockedProperties = planManager.generateFlagGraph(DependencyLevel.Field, attr).getCascadedFlagObject(DependencyLevel.Field)
      })

      //bake locked properties
      tracker.lockedProperties = planManager.generateFlagGraph(DependencyLevel.Tracker, tracker).getCascadedFlagObject(DependencyLevel.Tracker)
    })

    pack.triggers.forEach(trigger => {
      if (trigger.actionType === TriggerConstants.ACTION_TYPE_REMIND) {
        //reminder
        trigger.lockedProperties = planManager.generateFlagGraph(DependencyLevel.Reminder, trigger).getCascadedFlagObject(DependencyLevel.Reminder)
      } else {
        //logging
        trigger.lockedProperties = planManager.generateFlagGraph(DependencyLevel.Trigger, trigger).getCascadedFlagObject(DependencyLevel.Trigger)
      }
    })


    const deviceLocalId = -1
    let currentNanoStamp = 0
    const trackerIdTable = {}
    const fieldIdTable = {}
    const descriptionPanelIdTable = {}
    const fieldLocalIdTable = {}
    const triggerIdTable = {}

    const promises = []
    const newTriggers = []
    const newTrackers = []

    const currentDate = new Date()

    pack.trackers.forEach(tracker => {
      const matchedUserTracker = userTrackers.find(t => t.flags.injectedId === tracker.flags.injectedId)
      if (matchedUserTracker != null) {
        trackerIdTable[tracker._id] = matchedUserTracker._id
      } else {
        trackerIdTable[tracker._id] = IdGenerator.generateObjectId()
      }

      tracker.flags = merge(tracker.flags, creationFlags, true)

      if (!matchedUserTracker) {
        tracker.user = user._id
        tracker._id = trackerIdTable[tracker._id]
        tracker.userCreatedAt = currentDate.getTime()
        tracker.userUpdatedAt = currentDate.getTime()
        tracker.createdAt = currentDate
        tracker.updatedAt = tracker.createdAt
      }

      tracker.fields.forEach(field => {
        let matchedUserField: IFieldDbEntity = null

        if (matchedUserTracker) {
          matchedUserField = matchedUserTracker.fields.find(f => f.flags.injectedId === field.flags.injectedId)
        }

        if (matchedUserField != null) {
          fieldIdTable[field._id] = matchedUserField._id
          fieldLocalIdTable[field.localId] = matchedUserField.localId

          if (field.type === matchedUserField.type) {
            const fieldHelper = FieldManager.getHelper(field.type)
            fieldHelper.mergeFieldProperties(field, matchedUserField, field)
          }
        } else {
          fieldIdTable[field._id] = IdGenerator.generateObjectId()
          fieldLocalIdTable[field.localId] = IdGenerator.generateFieldLocalId(deviceLocalId, Date.now(), (++currentNanoStamp) % 1000)
        }

        field.flags = merge(field.flags, creationFlags, true)
        field._id = fieldIdTable[field._id]
        field.localId = fieldLocalIdTable[field.localId]
        field.trackerId = tracker._id

        // TODO deal with connection
        field.userCreatedAt = currentDate.getTime()
        field.userUpdatedAt = currentDate.getTime()
      })

      if (tracker.descriptionPanels != null) {
        tracker.descriptionPanels.forEach(panel => {

          let matchedUserDescriptionPanel: IDescriptionPanelDbEntity = null
          if (matchedUserTracker != null && matchedUserTracker.descriptionPanels != null) {
            matchedUserDescriptionPanel = matchedUserTracker.descriptionPanels.find(f => f.flags.injectedId === panel.flags.injectedId)
          }

          if (matchedUserDescriptionPanel != null) {
            descriptionPanelIdTable[panel._id] = matchedUserDescriptionPanel._id
          } else {
            descriptionPanelIdTable[panel._id] = IdGenerator.generateObjectId()
          }

          panel.flags = merge(panel.flags, creationFlags, true)
          panel._id = descriptionPanelIdTable[panel._id]
          panel.trackerId = tracker._id
        })
      }

      if (tracker.layout != null) {
        tracker.layout.forEach(elm => {
          switch (elm.type) {
            case "desc":
              elm.reference = descriptionPanelIdTable[elm.reference]
              break;
            case "field":
              elm.reference = fieldIdTable[elm.reference]
              break;
          }
        })
      }

      //make db command
      if (matchedUserTracker == null) {
        newTrackers.push(ModelConverter.convertClientToDbFormat(tracker))
      } else {
        //TODO fix naive field merge algorithm
        const arrayObjectMerge = require('array-object-merge')
        tracker.fields = arrayObjectMerge(matchedUserTracker.fields, tracker.fields, '_id')
        promises.push(OTTracker.updateOne({ _id: matchedUserTracker._id }, tracker))
      }
    })

    pack.triggers.forEach(trigger => {

      const matchedUserTrigger = userTriggers.find(t => t.flags.injectedId = trigger.flags.injectedId)

      if (matchedUserTrigger == null) {
        triggerIdTable[trigger._id] = IdGenerator.generateObjectId()
        trigger._id = triggerIdTable[trigger._id]
        trigger.userUpdatedAt = currentDate.getTime()
        trigger.createdAt = currentDate
        trigger.updatedAt = currentDate
        trigger.userCreatedAt = currentDate.getTime()
        trigger.user = user._id
      }

      trigger.flags = merge(trigger.flags, creationFlags, true)

      for (let i = 0; i < trigger.trackers.length; i++) {
        trigger.trackers[i] = trackerIdTable[trigger.trackers[i]]
      }

      if (trigger.script != null) {
        for (const id in trackerIdTable) {
          if (trackerIdTable.hasOwnProperty(id)) {
            trigger.script = trigger.script.replace(new RegExp(id, 'g'), trackerIdTable[id])
          }
        }
        for (const id in triggerIdTable) {
          if (triggerIdTable.hasOwnProperty(id)) {
            trigger.script = trigger.script.replace(new RegExp(id, 'g'), triggerIdTable[id])
          }
        }
        for (const id in fieldIdTable) {
          if (fieldIdTable.hasOwnProperty(id)) {
            trigger.script = trigger.script.replace(new RegExp(id, 'g'), fieldIdTable[id])
          }
        }
        for (const id in fieldLocalIdTable) {
          if (fieldLocalIdTable.hasOwnProperty(id)) {
            trigger.script = trigger.script.replace(new RegExp(id, 'g'), fieldLocalIdTable[id])
          }
        }
      }

      //make db command
      if (matchedUserTrigger == null) {
        newTriggers.push(ModelConverter.convertClientToDbFormat(trigger))
      } else {
        promises.push(OTTrigger.updateOne({ _id: matchedUserTrigger._id }, trigger))
      }
    })

    // save them to database
    const syncTypes = []
    if (pack.trackers.length > 0 || userTrackersToRemove.length > 0) {
      syncTypes.push(C.SYNC_TYPE_TRACKER)
      if (userTrackersToRemove.length > 0) {
        syncTypes.push(C.SYNC_TYPE_ITEM)
      }
    }

    if (pack.triggers.length > 0 || userTriggersToRemove.length > 0) {
      syncTypes.push(C.SYNC_TYPE_TRIGGER)
    }

    if (newTrackers.length > 0) {
      promises.push(OTTracker.insertMany(newTrackers))
    }

    if (newTriggers.length > 0) {
      promises.push(OTTrigger.insertMany(newTriggers))
    }

    try {
      const results = await Promise.all(promises)
      console.log("all trackers and triggers was injected to user database.")
      this.serverModule.registerMessageDataPush(user._id, this.pushModule.makeSyncMessageFromTypes(syncTypes))
      return
    } catch (err) {
      console.error(err)
      return err
    }
  }
}
