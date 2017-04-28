var currentTabId;
var __messageCallbacks = {};

function ScCallback(callback) {
  if( callback ) {
    var args = [];
    Array.prototype.push.apply( args, arguments );
    args.shift();
    return callback.apply(this, args);
  }
}

class ScObserver {
  constructor(observer) {
    this.callbacks = (observer && observer.callbacks) || [];
  }
  add(callback) {
    if( this.callbacks && callback ) {
      this.callbacks.push_back(callback);
    }
  }
}

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

// set extention browser action command script
function extentionSetCommand(cmd, callback) {
  extentionSendMessage('setExtentionCommand', cmd, callback)
}