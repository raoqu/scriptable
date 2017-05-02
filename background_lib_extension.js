
// Chrome extension wrapper for background page
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

  static onMessage(msg, callback) {
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
