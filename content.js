var currentTabId;
var __messageCallbacks = {};
var __downloadCallbacks = {};

// send message to background script
function extentionSendMessage(msg, data, callback) {
  chrome.runtime.sendMessage({
      noryal_message: msg,
      noryal_data: data
    },
    function(rsp) {
      if( callback ) {
        callback(rsp);
      }
    }
  );
}

// register callback for messages from background.js
function extentionRegisterEvent(msg, callback) {
  __messageCallbacks[msg] = callback;
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse){
    var rsp;
    if( request && request.noryal_message) {
      var callback = __messageCallbacks[request.noryal_message];
      if( callback) {
        rsp = callback(request.noryal_data, sender);
      }
    }
    rsp = rsp || {};
    sendResponse(rsp);
  }
);

// notify background.js to store data
function extentionStoreData(key, val, callback) {
  extentionSendMessage('storeData', {
      key: key,
      val: val
    },
    callback
  );
}

// retrive data from background.js
function extentionRetrieveData(key, callback) {
  extentionSendMessage('retrieveData', key, callback)
}

function extentionDownloadFile(url, path, callback) {
  if( callback && url ) {
    __downloadCallbacks[url] = callback;
  }
  extentionSendMessage('downloadFile', {
      url: url,
      filename: path,
    }
  );
}

// set extention browser action command script
function extentionSetCommand(cmd, callback) {
  extentionSendMessage('setExtentionCommand', cmd, callback)
}

// data.tabId
// data.url
// data.filename
// data.success
extentionRegisterEvent('onFileDownload', function(data){
  var key = (data && data.url) || 'not.exist';
  var callback = __downloadCallbacks[key];
  if( callback ) {
    callback(data.url, data.filename, data.success, data.tabId);
    delete __downloadCallbacks[key];
  }
});