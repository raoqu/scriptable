var MESSAGE_REGISTRY = {};
var GLOBAL_DATA = {};
var __downloadConcerns = {};
var __contentCommand;

class TabManager {
	constructor() {
		this.forks = {}; // {url: parentTabId}
	}
	register(url, parentTabId) {
		this.fork[url] = parentTabId;
	}
	get(url) {
		return this.fork[url];
	}
	remove(url) {
		let parentId = this.fork[url];
		delete this.fork[url];
		return parentId;
	}
}

var TAB_CREATE_REGISTRY = new TabManager();

// ----------- commands from content pages --------------
var GLOABAL_COMMANDS = {
	'storeData': function(data){
		if( data && data.key ) {
			GLOBAL_DATA[data.key] = data.val;
		}
	},

	'retrieveData': function(key){
		let data = key && GLOBAL_DATA[key];
		return data;
	},

	'removeData': function(key) {
		let data = key && GLOBAL_DATA[key];
		delete GLOBAL_DATA[key];
		return data;
	},

	'tabSet': function(data, sender){
		if( data && data.key ) {
			let key = '' + data.key + '__<<' + sender.tab.id;
			GLOBAL_DATA[key] = data.val;
		}
	},

	'tabGet': function(localKey, sender){
		let key = '' + localKey + '__<<' + sender.tab.id;
		let data = GLOBAL_DATA[key];
		return data;
	},

	'tabRemove': function(localKey, sender) {
		let key = '' + localKey + '__<<' + sender.tab.id;
		let data = GLOBAL_DATA[key];
		delete GLOBAL_DATA[key];
		return data;
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
				data.tabId = sender.tab && sender.tab.id;
				Extension.watchDownload(downloadId, data);
			}
		);
	},

	// Create a new tab
	//	data.url
	//	data.active
	//	data.selected
	'createTab': function(data, sender) {
		let attachedData = data.data;
		chrome.tabs.create({
				url: data.url,
				active: (data.active===false ? false : true),
				selected: (data.selected===false ? false : true)
			},
			function(tab) {
				let key = 'parentTab_' + tab.id;
				let val = attachedData;
				attachedData.parentTabId = sender.tab.id;
				GLOBAL_DATA[key] = attachedData;
			}
		);
	},

	// send a message to specified tab
	'sendTabMessage': function(data, sender) {
		data = data || {};
		let message = data.message;
		let tabId = data.tabId;
		data = data.data;

		if( tabId && message ) {
			let tabData = {};
			tabData.tabMessageData = data;
			tabData.fromTabId = sender.tab.id;
			Extension.sendMessageToTab(tabId, message, tabData, function(rsp){
				return rsp
			});
		}
	},

	'getCurrentTabId': function(data, sender) {
		return sender.tab.id;
	}

};

for( let key in GLOABAL_COMMANDS ) {
	Extension.onMessage(key, GLOABAL_COMMANDS[key]);
}

//--------------------- Extension listeners -----------------------------------

// message listener
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse){
		let rsp = undefined;
		if( request && request.noryal_message) {
			let message = request.noryal_message;
			let data = request.noryal_data;

			var callback = MESSAGE_REGISTRY[message];
			rsp = ScCallback(callback, this||{}, data, sender);
		}
		rsp = rsp || {};
		sendResponse(rsp);
	}
);

chrome.browserAction.onClicked.addListener(function(tab) {
	Extension.runCommand();
});

// monitoring download complete / failed event
// download.onChanged event tells the real filename downloaded
chrome.downloads.onChanged.addListener(function(delta){
	if( delta ) {
		let key = '' + delta.id;
		let concern = __downloadConcerns[key];
		delete __downloadConcerns[key];

		if( concern ) {
			if( delta.filename )
				concern.localfile = delta.filename.current;

			let state = delta.state && delta.state.current;
			if( state == 'interrupted' || state == 'complete') {
				let successMapping = {
					'interrupted': false,
					'complete': true
				}
				concern.success = successMapping[state];

				Extension.sendMessageToTab(concern.tabId, 'onFileDownload', concern);
			}
		}
	}
});
//-----------------------------------------------------