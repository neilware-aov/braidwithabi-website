// Everything is in app.json. This only adds the Firebase file for Android
// push alerts, which is kept out of the (public) repository: on EAS it comes
// from the GOOGLE_SERVICES_JSON file variable, locally from ./google-services.json.
const { existsSync } = require("node:fs");

module.exports = ({ config }) => {
  const firebase =
    process.env.GOOGLE_SERVICES_JSON || (existsSync("./google-services.json") ? "./google-services.json" : undefined);
  return {
    ...config,
    android: { ...config.android, ...(firebase ? { googleServicesFile: firebase } : {}) },
  };
};
