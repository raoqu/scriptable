var currentTabId;
var __messageCallbacks = {};
var __tabMessageCallbacks = {};
var __messageWatching = false;

class Extension {

	// send message to background script
	static sendMessage(msg, data, callback) {
		chrome.runtime.sendMessage({
				noryal_message: msg,
				noryal_data: data
			},
			function(rsp) {
				ScCallback(callback, this||{}, rsp);
			}
		);
	}

	// send message to specified tab
	static sendToTab(tabId, msg, data, callback) {
		if( tabId && msg ) {
			let tabData = {};
			tabData.tabId = tabId;
			tabData.message = msg;
			tabData.data = data || {};
			Extension.sendMessage('sendTabMessage', tabData, function(rsp){
				ScCallback(callback, this||{}, rsp);
			})
		}
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

	// retrive data from background page
	static get(key, callback) {
		Extension.sendMessage('retrieveData', key, callback)
	}

	// get and remove data form background page
	static remove(key, callback) {
		Extension.sendMessage('removeData', key, callback);
	}

	// register callback for messages from background.js
	static onMessage(msg, callback) {
		Extension.watchMessages();
		__messageCallbacks[msg] = callback;
	}

	static onTabMessage(msg, callback) {
		Extension.watchMessages();
		__tabMessageCallbacks[msg] = callback;
	}

	// Get the current tab id
	//	callback(tabId)
	static getCurrentTabId(callback) {
		Extension.sendMessage('getCurrentTabId', '', callback)
	}

	// Get parent tab id
	//	child - parent tab relation must be registered by createTab
	//	callback(parentTabId)
	static getParentTabId(callback, remove) {
		Extension.getCurrentTabId(function(tabId){
			let key = 'parentTab_' + tabId;
			if( remove !== false ) {
				Extension.remove(key, callback);
			}
			else {
				Extension.get(key, callback)
			}
		});
	}

	// Create a new tab
	//	callback(currentTabId, childTabId)
	static createTab(url, active, selected, callback) {
		Extension.sendMessage('createTab', {
			url: url,
			active: active,
			selected: selected
		}, callback);
	}

	// listen messages from background page
	static watchMessages() {
		if( __messageWatching )
			return;

		chrome.runtime.onMessage.addListener(
			function(request, sender, sendResponse){
				var rsp;
				if( request && request.noryal_message) {
					let message = request.noryal_message;
					let data = request.noryal_data;
					let callback = undefined;
					if( data.tabMessageData ) {
						data = data.tabMessageData;
						callback = __tabMessageCallbacks[message];
					}
					else {
						callback = __messageCallbacks[message];
					}

					rsp = ScCallback(callback, this||{}, data, sender);
				}
				rsp = rsp || {};
				sendResponse(rsp);
			}
		);
	}

}

// set extention browser action command script
function extentionSetCommand(cmd, callback) {
	Extension.sendMessage('setExtentionCommand', cmd, callback)
}