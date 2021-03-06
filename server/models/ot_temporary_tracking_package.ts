import * as mongoose from 'mongoose';
const randomstring = require('randomstring');

function generateNewId(): string {
  return "ot-tpkg-" + randomstring.generate({ length: 8, charset: 'numeric' })
}

const otTrackingPackageSchema = new mongoose.Schema({
  _id: { type: String, default: generateNewId },
  accessKey: { type: String, unique: true, required: true },
  uploader: { type: String, ref: 'OTUser', required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

const model = mongoose.model('OTTemporaryTrackingPackage', otTrackingPackageSchema);

export default model;