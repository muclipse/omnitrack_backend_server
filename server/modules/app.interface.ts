import PushModule from "./push.module";
import ServerModule from "./server.module";
import OmniTrackModule from "./omnitrack.module";
import { Application } from "express-serve-static-core";
import SocketModule from "./socket.module";

export default interface AppInterface {
  pushModule(): PushModule
  serverModule(): ServerModule
  omnitrackModule(): OmniTrackModule
}

export class AppWrapper implements AppInterface {

  constructor(private readonly app: Application) {}

  pushModule(): PushModule {
    return this.omnitrackModule().pushModule
  }
  serverModule(): ServerModule {
    return this.omnitrackModule().serverModule
  }
  omnitrackModule(): OmniTrackModule {
    return this.app.get("omnitrack")
  }

  socketModule(): SocketModule {
    return this.omnitrackModule().socketModule
  }

}