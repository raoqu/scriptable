var MESSAGE_REGISTRY = {};
var contentData = {};
var __downloadConcerns = {};
var __contentCommand;


// ----------- commands from content pages --------------
var GLOABAL_COMMANDS = {
  'storeData': function(data){
    if( data && data.key ) {
      contentData[data.key] = data.val;
    }
  },

  'retrieveData': function(key){
    if( key )  {
      return contentData[key];
    }
    return undefined;
  },

  'setExtentionCommand': function(cmd){
    __contentCommand = cmd;
  },

  'setBadge': function(data, sender){
    Extension.setBadgeText(data.text, false);
  },

  'downloadFile': function(data, sender){
    chrome.downloads.download({
        url: data.url,
        filename: data.filename
      },
      function(downloadId){
        var concern = {
          id: data.id,
          url: data.url,
          filename: data.filename,
          key: data.key,
          tabId: sender.tab.id
        }
        Extension.watchDownload(downloadId, concern);
      }
    );
  }

};

for( let key in GLOABAL_COMMANDS ) {
  Extension.onMessage(key, GLOABAL_COMMANDS[key]);
}

//--------------------- Extension listeners -----------------------------------

var state = {value:0};

// message listener
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse){
    var rsp;
    if( request && request.noryal_message) {
      var callback = MESSAGE_REGISTRY[request.noryal_message];
      if( callback) {
        rsp = callback(request.noryal_data, sender);
      }
    }
    rsp = rsp || {};
    sendResponse(rsp);
  }
);

chrome.browserAction.onClicked.addListener(function(tab) {
  state.value = 0;
  if( state.value ) {
    state.value = 0;
    Extension.setBadgeText('', true);
  }
  else {
    state.value= 1;
    Extension.runCommand();
  }
});

// monitoring download complete / failed event
// download.onChanged event tells the real filename downloaded
chrome.downloads.onChanged.addListener(function(delta){
  if( delta ) {
    var key = '' + delta.id;
    var concern = __downloadConcerns[key];
    if( concern ) {
      if( delta.filename )
        concern.localfile = delta.filename.current;
      if( delta.state ) {
        var state = delta.state.current;
        if( state == 'interrupted' || state == 'complete') {
          let successMapping = {
            'interrupted': false,
            'complete': true
          }
          concern.success = successMapping[state];

          Extension.sendMessage(concern.tabId, 'onFileDownload', concern);
          delete __downloadConcerns[key];
        }
      }
    }
  }
});
//-----------------------------------------------------