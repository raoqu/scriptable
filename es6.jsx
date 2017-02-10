var options = {
  convertToLocalImagePath: true
};

var defaultConfig = {
  key: '-1',
  name: 'default demo',
  domain: '*',
  code: 'alert(window.location.href);'
};

var config = [defaultConfig];
var OPTION_KEY = 'noryalScriptable';

function reloadConfig() {
  chrome.storage.sync.get({noryalScriptable: JSON.stringify(config)}, function(storageData){
    var data = storageData[OPTION_KEY] || '[]';
    if( data ) {
      config = JSON.parse(data);
      console.log('load config: ' + config.length + ' items')
    }
  });
}

$(function(){
  reloadConfig();

  $('a.extentionTrigger').on('click', function(e) {
    var action = $(e.target).attr('action');
    if( action == 'reloadConfig') {
      reloadConfig();
    }
  });
})

function trigger() {
  if( config.length < 1 ) {
    reloadConfig();
  }
  var name = '';
  var found = false;
  var url = window.location.href;
  if( url ) {
    for( var i = 0; i < config.length; i ++ ) {
      var pattern = config[i].domain || '*';
      pattern = pattern.replace(/\//g, '\\/');
      pattern = pattern.replace(/\./g, '\\.');
      pattern = pattern.replace(/\*/g, '.*');
      pattern = pattern.replace(/\?/g, '.?');

      var code = config[i].code;
      name = config[i].name;
      var regx = eval('/' + pattern + '/');
      if( url.match(regx)) {
        console.log('match:' + pattern)
        found = true;
        eval(code);
      }
    }
    if( ! found ) {
      console.log('not found in ' + config.length + ' items')
    }
  }
}

chrome.storage.onChanged.addListener(function(changes, namespace) {
  for (var key in changes) {
    if( key == OPTION_KEY ) {
      reloadConfig();
    }
    var storageChange = changes[key];
    //console.log('Storage key "%s" in namespace "%s" changed. Old value was "%s", new value is "%s".', key, namespace, storageChange.oldValue, storageChange.newValue);
  }
});

extentionSetCommand("if(trigger) trigger(); else alert('some thing wrong')");