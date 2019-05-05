# OmniTrack Official Backend Server + Research Web Platform
<https://omnitrack.github.io>

**This project is a part of _OmniTrack For Research_** (https://github.com/OmniTrack/omnitrack_for_research)

For more information, Refer to the documentation of OmniTrack For Research. (https://github.com/OmniTrack/omnitrack_for_research_kit)

<img src="https://github.com/OmniTrack/omnitrack_for_research/blob/master/resources/omnitrack_for_research_logo.svg" width=400>

---

## Author

#### Young-Ho Kim (yhkim@hcil.snu.ac.kr)
http://younghokim.net
Seoul National University

----

## License
MIT License

## Project Structure
1. **angular.json**: The project depends on [Angular-CLI](https://github.com/angular/angular-cli). If you add a library which requires you to add external dependencies to another CSS or Javascript files, add them in this file.
2. **server**: contains source codes for backend server. The server is built with [Express.js](http://expressjs.com/) and manages backend database stored in MongoDB through REST API.

   * **models**: contains model schema for MongoDB entities.
   * **router_api.ts**: routing URIs for REST APIs that can be accessed by OmniTrack mobile app users.
   * **router_research.ts**: routing URIs for REST APIs used by the *research platform* client.

3. **client**: contains source codes for client web applications. The client is built with [Angular 5](https://angular.io/).

   * **style.scss**: a global stylesheet
   * **app**: contains main web app codes.
      * **Angular Modules**
         1. **AppModule** (app.module.ts): 
         2. **ResearchModule** (research.module.ts):
         3. **RoutingModule** (routing.module.ts):
         4. **MaterialDesignModule** (material-design.module.ts): 
         
      * **Angular Components**
         1. **Research Platform**
            1. **Authorization and Account Profile**
               * ResearcherLoginComponent (research-login/\*)
               * ResearcherSignupComponent (research-signup/\*)
               * ResearcherAccountSettingsComponent (researcher-account-settings/\*)
               
      * **Angular Services**
         1. **ResearcherAuthService** (services/researcher.auth.service.ts)
         
            Defines researcher authorization and authentication APIs and holds the signed-in researcher's ids and token informations.
         
         2. **ResearchApiService** (services/research-api.service.ts)
        
            Defines researcher-level APIs that can mostly be accessed by signed-in researchers. This service also holds the cached data of API call to enhance performance. the cached data are automatically refreshed by Websocket notifications from server. 
         
         3. **ExperimentService** (services/experiment.service.ts)
            
            Defines experiment-level APIs of the experiment detail pages. This service also holds the cached data of API call to enhance performance. the cached data are automatically refreshed by Websocket notifications from server. *This service is NOT injected by Angular but maintained by ResearcherApiService.*                        
         
         4. **SocketService** (services/socket.service.ts)
         
            Manages connection with server's WebSocket communication. The communication is implemented using [Socket.io](https://socket.io/). In the research platform, the websocket communication is usually used for receiving notification when the server database is changed.
         
         5. **NotificationService** (services/notification.service.ts)
            
            Manages communication between Notification GUIs and notification sender. This service provides API to enqueue the messages to be notified to current researcher. The GUI components such as Snackbar observes the queue and display notification when new message is enqueued.
         
         6. **TrackingDataService** (services/tracking-data.service.ts)
         
            Manages OmniTrack tracking entities of the OmniTrack users.

4. **shared_lib**: contains TypeScript codes that are shared between the server and the client.

5. **omnitrack**:  contains OmniTrack-related codes that are shared between the server and the client.
