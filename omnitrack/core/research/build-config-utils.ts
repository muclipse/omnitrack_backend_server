import { IAndroidBuildConfig, ANDROID_PACKAGE_NAME_REGEX, IClientBuildConfigBase } from "./db-entity-types";

export function validateBuildConfig(config: IClientBuildConfigBase<any>): Array<{ key: string, error?: any, message: string }> {
  switch (config.platform) {
    case "Android":
      return validateAndroidBuildConfig(config)
  }
}

export function validateAndroidBuildConfig(config: IAndroidBuildConfig): Array<{ key: string, error?: any, message: string }> {

  const errors = new Array<{ key: string, error?: any, message: string }>()

  //check android package name
  if (config.packageName == null) {
    errors.push({
      key: "packageName",
      message: "A package name is not set."
    })
  } else {
    if (ANDROID_PACKAGE_NAME_REGEX.test(config.packageName) === false) {
      errors.push({
        key: "packageName",
        message: "Not a valid package name for Android."
      })
    }
  }

  if (config.sourceCode == null) {
    errors.push({
      key: "sourceCode",
      message: "Source code is not set."
    })
  }

  if (config.credentials == null) {
    errors.push({
      key: "credentials",
      message: "Credential is not set."
    })
  } else {
    if (config.credentials.googleServices == null) {
      errors.push({
        key: "credentials.googleServices",
        message: "Please upload a google-service.json"
      })
    } else {
      var isMalformed = false
      const json = config.credentials.googleServices
      if (json.project_info) {
      } else isMalformed = true

      if (json.client instanceof Array) {
        let foundPackageName = false
        for (const client of json.client) {
          if (client.client_info) {
            if (client.client_info.android_client_info) {
              if (client.client_info.android_client_info.package_name === config.packageName) {
                foundPackageName = true
                break;
              }
            }
          }
        }
        if (foundPackageName === false) {
          errors.push({
            key: "credentials.googleServices",
            message: "The json does not contain an Android App info with the package name you entered. Check the Firebase Project dashboard whether you've added the Android App with the package name \"" + config.packageName + "\"."
          })
        }
      } else {
        isMalformed = true
      }

      if (isMalformed === true) {
        errors.push({
          key: "credentials.googleServices",
          message: "Wrong formatted JSON file. Check you uploaded the right file."
        })
      }
    }

    if (config.credentials.keystoreFileHash == null) {
      errors.push({
        key: "credentials.keystoreFileHash",
        message: "Please upload a keystore file."
      })
    }

    ["keystoreAlias", "keystoreKeyPassword", "keystorePassword"].forEach(
      key => {
        if (config.credentials[key] == null) {
          errors.push({
            key: "credentials." + key,
            message: "Please provide a value."
          })
        }
      }
    )
  }

  return errors
}