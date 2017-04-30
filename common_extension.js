var currentTabId;
var __messageCallbacks = {};

class Extension {

	// send message to background script
	static sendMessage(msg, data, callback) {
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

	// notify background.js to store data
	static set(key, val, callback) {
	  Extension.sendMessage('storeData', {
	      key: key,
	      val: val
	    },
	    callback
	  );
	}

	// retrive data from background.js
	static get(key, callback) {
	  Extension.sendMessage('retrieveData', key, callback)
	}

	// register callback for messages from background.js
	static onMessage(msg, callback, obj) {
	  __messageCallbacks[msg] = callback;
	}

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



// set extention browser action command script
function extentionSetCommand(cmd, callback) {
  Extension.sendMessage('setExtentionCommand', cmd, callback)
}