var options = {
  convertToLocalImagePath: true
};

var defaultConfig = {
  key: '-1',
  name: 'default demo',
  domain: '*',
  code: 'console.log(window.location.href);'
};

var config = [defaultConfig];
var OPTION_KEY = 'noryalScriptable';

function reloadConfig(callback) {
  chrome.storage.local.get({ noryalScriptable: JSON.stringify(config) }, function (storageData) {
    var data = storageData[OPTION_KEY] || '[]';
    if (data) {
      config = JSON.parse(data);
      for (var i = 0; i < config.length; i++) {
        config[i].type = config[i].type || "click";
      }
      //console.log('load config: ' + config.length + ' items');

      if (callback) {
        callback();
      }
    }
  });
}

$(function () {
  // reload config and execute scripts for onLoad event
  reloadConfig(function () {
    executeForType('load');
  });

  $('a.extentionTrigger').on('click', function (e) {
    var action = $(e.target).attr('action');
    if (action == 'reloadConfig') {
      reloadConfig();
    }
  });
});

function executeForType(type) {
  if (config.length < 1) {
    reloadConfig();
  }
  var name = '';
  var found = false;
  var url = window.location.href;
  
  if (url) {
    for (var i = 0; i < config.length; i++) {
      var pattern = config[i].domain || '*';
      pattern = pattern.replace(/\//g, '\\/');
      pattern = pattern.replace(/\./g, '\\.');
      pattern = pattern.replace(/\*/g, '.*');
      pattern = pattern.replace(/\?/g, '.?');

      if (config[i].type == type) {
        var code = config[i].code;
        name = config[i].name;
        var regx = eval('/' + pattern + '/');
        if (url.match(regx)) {
          found = true;
          eval(code);
        }
      }
    }
    if (!found) {
      console.log('not found in ' + config.length + ' items');
    }
  }
}

function trigger() {
  executeForType('click');
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (var key in changes) {
    if (key == OPTION_KEY) {
      reloadConfig();
    }
    var storageChange = changes[key];
    //console.log('Storage key "%s" in namespace "%s" changed. Old value was "%s", new value is "%s".', key, namespace, storageChange.oldValue, storageChange.newValue);
  }
});

extentionSetCommand("trigger();");
