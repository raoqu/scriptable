var MESSAGE_REGISTRY = {};
var contentData = {};
var __downloadConcerns = {};
var __contentCommand;

var __single_download_meta_group = new MetaTree(); // single file download
var __batch_download_meta_group = new MetaTree(); // batch file download, single stored int __batch_download_meta_group.metadata (@See MetaTree)


// chrome extension wrapper
class Extension {
  static sendMessage(tabId, msg, data, callback) {
    chrome.tabs.sendMessage(tabId, 
      {
        noryal_message: msg,
        noryal_data: data
      }, 
      function(rsp) {
        if( callback ) callback(rsp);
      }
    );
  }

  static registerEvent(msg, callback) {
    MESSAGE_REGISTRY[msg] = callback;
  }

  static getCurrentTab(callback) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if( tabs && tabs.length>0) {
        callback(tabs[0]);
        chrome.browserAction.setBadgeText({
          text: text,
          tabId: tabs[0].id
        })
      }
    });
  }

  // do for one or all tabs
  // function callback(data, tab);
  static runForTab(callback, data, allTabs) {
    if( allTabs) {
      callback(data);
    }
    else {
      Extension.getCurrentTab(function(tab){
        callback(data, tab);
      })
    }
  }

  // set badget text for one or all tabs
  static setBadgeText(text, allTabs) {
    Extension.runForTab(function(data, tab){
      chrome.browserAction.setBadgeText({
        text: text,
        tabId: tab ? tab.id : undefined
      });
    }, text, allTabs);
  }


  static runCommand() {
    var script = __contentCommand || "alert('unknown command')"
    if( __contentCommand ) {
      chrome.tabs.executeScript(null, {code: script});
    }
    else {}
  }


  static watchDownload(id, data) {
    var key = '' + id;
    __downloadConcerns[key] = data;
  }
}

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

Extension.registerEvent('storeData', function(data){
  if( data && data.key ) {
    contentData[data.key] = data.val;
  }
});

Extension.registerEvent('retrieveData', function(key){
  if( key )  {
    return contentData[key];
  }
  return undefined;
});

Extension.registerEvent('setExtentionCommand', function(cmd){
  console.log('setExtentionCommand: ' + cmd)
  __contentCommand = cmd;
})

Extension.registerEvent('setBadge', function(data, sender){
  Extension.setBadgeText(data.text, false);
});

Extension.registerEvent('downloadFile', function(data, sender){
  chrome.downloads.download({
      url: data.url,
      filename: data.filename
    },
    function(downloadId){
      var concern = {
        url: data.url,
        filename: data.filename,
        key: data.key,
        tabId: sender.tab.id
      }
      Extension.watchDownload(downloadId, concern);
    }
  );
});

// monitoring download complete / failed event
chrome.downloads.onChanged.addListener(function(delta){
  console.log(delta);
  if( delta ) {
    var key = '' + delta.id;
    var concern = __downloadConcerns[key];
    if( concern ) {
      if( delta.filename )
        concern.filename = delta.filename.current;
      if( delta.state ) {
        var state = delta.state.current;
        if( state == 'interrupted')
          concert.success = false;
        else if( state == 'complete')
          concern.success = true;

        if( typeof concern.success == 'boolean') {
          Extension.sendMessage(concern.tabId, 'onFileDownload', concern);
          delete __downloadConcerns[key];
        }
      }
    }
  }
});
//-----------------------------------------------------