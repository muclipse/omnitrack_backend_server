import OTResearcher from '../models/ot_researcher'
import OTExperiment from '../models/ot_experiment'
import OTInvitation from '../models/ot_invitation'
import { Document } from 'mongoose';


var crypto = require("crypto");

export default class OTExperimentCtrl {

  private _getExperiment(researcherId:string, experimentId: string): Promise<Document>{
    return OTExperiment.findOne({ $and: [ {_id: experimentId}, {$or: [{manager: researcherId}, {experimenters: researcherId}]} ] }).then(doc=>doc)
  }

  getExperimentInformationsOfResearcher = (req, res)=>{
    const researcherId = req.researcher.uid
    console.log("find experiments of the researcher: " + researcherId)
    OTResearcher.findById(researcherId).then((researcher)=>{
      console.log("found researcher: " + researcher)
      OTExperiment.find({_id: {
        $in: (researcher as any).experiments
      }}).then(experiments=>{
        console.log(experiments)
        res.status(200).json(experiments)
      }).catch(err=>{
        console.log(err)
        res.status(500).send(err)
      })
    })
  }

  getExperiment = (req, res)=>{
    const researcherId = req.researcher.uid
    const experimentId = req.params.experimentId
    this._getExperiment(researcherId, experimentId).then(exp=>{
        console.log(exp)
        res.status(200).json(exp)
      })
      .catch(err=>{
        console.log(err)
        res.status(500).send(err)
      })
  }

  getManagerInfo = (req, res)=>{
    const researcherId = req.researcher.uid
    const experimentId = req.params.experimentId
    this._getExperiment(researcherId, experimentId).then(exp=>{
      if(exp!=null)
      {
        if(exp["manager"])
        {
          OTResearcher.findById(exp["manager"]).then(
            manager=>
            {
              if(manager!=null)
              {
                res.status(200).json(
                  {
                    uid: manager["_id"],
                    email: manager["email"],
                    alias: manager["alias"]
                  }
                )
              }
              else{
                res.sendStatus(404)
              }
            }
          )
        }
      }
    })
  }

  getInvitations = (req, res)=>{
    const researcherId = req.researcher.uid
    const experimentId = req.params.experimentId
    OTInvitation.find({experiment: experimentId}, (err, list)=>{
      if(err!=null)
      {
        res.status(500).send(err)
      }
      else{
        res.status(200).json(list)
      }
    })
  }

  removeInvitation = (req, res)=>{
    const researcherId = req.researcher.uid
    const experimentId = req.params.experimentId
    const invitationId = req.params.invitationId
    OTInvitation.findOneAndRemove({_id: invitationId, experiment: experimentId}).then(removed=>{
      res.status(200).send(true)
    })
    .catch(err=>{
      res.status(500).send(err)
    })
  }
  
  addNewIntivation = (req, res)=>{
    const researcherId = req.researcher.uid
    const experimentId = req.params.experimentId
    const data = req.body
    new OTInvitation({
      code: crypto.randomBytes(16).toString('base64'),
      experiment: experimentId,
      isActive: true,
      groupMechanism: data
    }).save().then(
      invit=>{
        res.status(200).json(invit)
      }
    ).catch(err=>{
      console.log(err)
      res.status(500).send(err)
    })
  }
}