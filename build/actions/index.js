(function() {
  module.exports = {
    wizard: require('./wizard'),
    app: require('./app'),
    info: require('./info'),
    auth: require('./auth'),
    drive: require('./drive'),
    device: require('./device'),
    env: require('./environment-variables'),
    keys: require('./keys'),
    logs: require('./logs'),
    notes: require('./notes'),
    preferences: require('./preferences'),
    help: require('./help'),
    plugin: require('./plugin')
  };

}).call(this);
