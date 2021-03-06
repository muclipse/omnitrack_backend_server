import * as path from "path";
import { merge } from "../shared_lib/utils";
import * as fs from "fs-extra";
import { BehaviorSubject } from "rxjs";
const environmentPath = path.join(
  __dirname,
  "../../../credentials/environment.json"
);

let env: IEnvironment;

if (fs.pathExistsSync(environmentPath) !== true) {
  // copy sample file
  try {
    fs.copySync(
      path.join(__dirname, "../../../credentials/environment.sample.json"),
      environmentPath
    );
  } catch (err) {
    console.log(err);
    console.log("check for the environment.sample.json file existing.");
  }
}

function reloadEnvironment(fromJson?: IEnvironment) {
  if (fromJson) {
    env = merge(env, fromJson, true, true);
  } else {
    try {
      env = require(environmentPath);
    } catch (err) {
      env = null;
      console.log(err);
    }
  }
}

function saveEnv(): Promise<void> {
  if (env) {
    return fs.writeJson(environmentPath, env, { spaces: 2, EOL: "\n" });
  } else { return Promise.reject("env instance is null"); }
}

reloadEnvironment();

export default env;
export { environmentPath, reloadEnvironment, saveEnv };

export interface IEnvironment {
  installation_mode?: boolean;
  node_env?: string;
  mongodb_uri?: string;
  mongodb_test_uri?: string;
  mongodb_agenda_uri?: string;
  mongodb_agenda_test_uri?: string;
  frontend_host: string;
  jwt_secret?: string;
  use_mailer?: boolean;
  force_private_ip?: boolean;
  mailer?: {
    provider?: string;
    api_key?: string;
    sender_name?: string;
    sender_email?: string;
  };
  super_users?: Array<string>;
}
