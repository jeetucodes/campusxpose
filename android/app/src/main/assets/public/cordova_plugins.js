
  cordova.define('cordova/plugin_list', function(require, exports, module) {
    module.exports = [
      {
          "id": "onesignal-cordova-plugin.OneSignalPlugin",
          "file": "plugins/onesignal-cordova-plugin/dist/index.cjs",
          "pluginId": "onesignal-cordova-plugin",
        "clobbers": [
          "OneSignal"
        ]
        }
    ];
    module.exports.metadata =
    // TOP OF METADATA
    {
      "onesignal-cordova-plugin": "5.5.2"
    };
    // BOTTOM OF METADATA
    });
    