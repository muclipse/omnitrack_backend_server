import * as mongoose from 'mongoose';

const otInvitationSchema = new mongoose.Schema({
  code: { type: String, required: true, index: true },
  experiment: { type: String, ref: 'OTExperiment' },
  groupMechanism: mongoose.Schema.Types.Mixed
}, { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } });


otInvitationSchema.virtual('participants', {
  ref: 'OTUser',
  localField: '_id',
  foreignField: 'participationInfo.invitation',
  justOne: false
})

otInvitationSchema.index({ code: 1, experiment: 1 }, {unique: true})

const OTInvitation = mongoose.model('OTInvitation', otInvitationSchema);

export default OTInvitation;
