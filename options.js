var newKey = 1;
var currentScript;
var defaultConfig = {
  key: '-1',
  name: 'default demo',
  domain: '*',
  status: 'enabled',
  code: 'alert(window.location.href);'
};
var config = [defaultConfig];
var OPTION_KEY = 'noryalScriptable';

var flask = new CodeFlask,
    flasks = new CodeFlask;

flask.run('#code', {
    language: 'js'
});

flask.onUpdate(function(code){
  onUpdateCode(code);
});

function onUpdateCode(code) {
}

function storeCurrentItem() {
  var a = $('li>a.active');
  var item = null;
  if( a && a.length > 0 ) {
    var key = a.attr('key');
    item = findConfigItem(key);
    if( item ) {
      item.name = $('#name').val();
      item.domain = $('#domain').val();
      item.code = $('#code').text();
      item.type = $('#type').val();
      item.status = $('#status').val();
      let enabled = (item.status != 'disabled');
      if( ! item.name && ! item.domain && ! item.code ) {
        var a = $('li>a.item[key="' + key + '"]');
        if( a && a.length> 0 ) {
          a.parent().remove();
          deleteConfigItem(key);
          item = null;
        }
      }
      else {
        var a = $('li>a.item[key="' + key + '"]');
        if( a ) {
          enabled && a.removeClass('disabled');
          !enabled && a.addClass('disabled');
        }
      }
    }
    var data = JSON.stringify(config);
    //localStorage.setItem(OPTION_KEY, data);
    chrome.storage.local.set({noryalScriptable: data});
    return item;
    // trigger content script to reload configuration
    //fakeClick(event, document.getElementById('reloadConfig'));
  }
}

function getCurrentItemIndex() {
  var a = $('li>a.active');
  if( a && a.length > 0 ) {
    var key = a.attr('key');
    for( var i = 0; i < config.length; i ++ ) {
      var item = config[i];
      if( item.key == key)
        return i;
    }
  }
  return -1;
}

function trim(s) {
  return (s || '').replace(/\s+$/g,"");
}

function onNameChanged() {
  var name = $('#name').val() || '>';
  var a = $('li>a.active');
  if( a && a.length > 0 )
    a[0].innerText = name;
}

function findConfigItem(key) {
  for( var i = 0; i < config.length; i ++ ) {
    var item = config[i];
    if( item.key == key)
      return item;
  }
  return null;
}

function deleteConfigItem(key) {
  for( var i = 0; i < config.length; i ++ ) {
    var item = config[i];
    if( item.key == key) {
      config.splice(i, 1);
      var index = i < config.length ? i : (i < 1 ? -1: i-1);
      if( index >= 0 )
        return config[index];
    }
  }
  return null;
}

function modifyItem(key) {
  storeCurrentItem();
  var item = findConfigItem(key);
  if( ! item ) {
    return;
  }
  currentConfig = item;
  $('#name').val(item.name);
  $('#domain').val(item.domain);
  $('#type').val(item.type || "click");
  $('#status').val(item.status || "enabled");
  $('.type-select').trigger("chosen:updated");

  $('li>a.item').removeClass('active');
  $('li>a.item[key="' + key + '"]').addClass('active');
  setCode(item.code);
}

function addListItem(key, name, active, enabled) {
  key = '' + key;
  var className = 'item';
  var id = 'item_' + key;
  if( active ) className += ' active';
  if( ! enabled ) className += ' disabled';
  $('.configlist').append('<li id="' + id + '"><a class="' + className + '" href="#" key="' + key + '">' + name + '</a></li>');
  $('li>a.item[key="' + key + '"]').click(function(e){ 
    var target = $(e.target);
    if( target && target.length > 0 ) {
      var key = target.attr('key');
      modifyItem(key);
    }
  });
}

function addItem() {
  var key = '' + newKey;
  newKey ++;
  var item = {
    key: key,
    name: key,
    domain: '',
    code: '',
    status: 'enabled'
  };
  config.push(item);
  modifyItem(key);

  addListItem(key, key, true, true);
}

function setCode(s) {
  var code = trim(s);
  $('#code').text(code || '');
  flask.run('#code', {
      language: 'js'
  });
  flask.onUpdate(function(code){
    onUpdateCode(code);
  });
}

function loadConfiguration(cfg) {
  config = cfg;
  $('.configlist').empty();
  var i = 0;
  for( i = 0; i < config.length; i ++ ) {
    var item = config[i];
    item.key = '' + (i+1);
    addListItem(item.key, item.name, false, (item.status!='disabled'));
  }
  newKey = i + 1;
  if( i > 0 ) {
    modifyItem('' + config[i-1].key);
  }
}

$(function(){
  chrome.storage.local.get({noryalScriptable: JSON.stringify(config)}, function(storageData){
    var data = storageData[OPTION_KEY] || '[]';
    if( data ) {
      var cfg = JSON.parse(data);
      loadConfiguration(cfg);
    }
  });

  $(".type-select").chosen({
    disable_search_threshold: 10
  });
})

function fakeClick(event, anchorObj) {
  if (anchorObj.click) {
    anchorObj.click()
  } else if(document.createEvent) {
    if(event.target !== anchorObj) {
      var evt = document.createEvent("MouseEvents"); 
      evt.initMouseEvent("click", true, true, window, 
          0, 0, 0, 0, 0, false, false, false, false, 0, null); 
      var allowDefault = anchorObj.dispatchEvent(evt);
      // you can check allowDefault for false to see if
      // any handler called evt.preventDefault().
      // Firefox will *not* redirect to anchorObj.href
      // for you. However every other browser will.
    }
  }
}

initFileInputUI(function(e){
  var files = e.target.files; // FileList object
    for (var i = 0, f; f = files[i]; i++) {
      //console.log(f.name + ',' + (f.type || 'n/a') + ',' + f.size + ' bytes, last modified: ' + (f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a'));
      var reader = new FileReader();
      reader.onload = (function(theFile) {
        var file = theFile;
        return function(e) {
          var content = e.target.result;
          if( content ) {
            var cfg = JSON.parse(content);
            console.log(file.name);
            loadConfiguration(cfg);
          }
        }
      })(files[i], reader);
      reader.readAsText(files[i]);
    }
});


function onStoreConfiguration() {
  var index = getCurrentItemIndex();
  var item = storeCurrentItem();
  if( ! item ) {
    index = Math.min(index, config.length - 1);
    if( index >= 0 ) {
      var key = $($('li>a.item')[index]).attr('key');
      modifyItem(key);
    }
  }
}

function downloadFile(url, filename) {
  chrome.runtime.sendMessage( 
    {
      noryal_message: 'downloadFile',
      noryal_data: {
        url: url,
        filename: filename
      }
    }
  );
}

$('a.add').on('click', addItem);
$('#name').on('input', onNameChanged)
$('a.export').on('click', function(){
  let docContent = JSON.stringify(config, null, 2);
  let url = URL.createObjectURL( new Blob([docContent], {type: 'application/octet-binary'}) );
  downloadFile(url, 'scriptable.json');
})
$('button').on('click', onStoreConfiguration);
