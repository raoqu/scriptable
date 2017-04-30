var __downloadCallbacks = {};
var __batchDownloads = [];
__downloadCallbacks['nothing'] = new ScObserver();

class ScBatchDownloadOption {
  constructor(urls, path, callback, complete) {
    this.callback
  }
}

// download callback
//    function({url, filename, success, tabId, complete})

function extentionDownloadFile(url, path, callback) {
  if( url ) {

    var observer = new ScObserver(__downloadCallbacks[url]);
    obs.add(callback);
    __downloadCallbacks[url] = obs;

    // notify background page to download file
    // a 'onFileDownload' message will be received once file downloaded
    extentionSendMessage('downloadFile', {
        url: url,
        filename: path,
        key: BaseUtils.uniqId()
      }
    );
  }
}

// Callback will be called times for each file with arguments:
//		data.{tabId, url, filename, success, allComplete}
function extentionBatchDownload(urls, path, scBatchDownloadOption) {
	if( urls && urls.length > 0) {
	}
}

// data.{tabId, url, filename, success}
Extension.on(
  'onFileDownload', 
  function(data){
    let key = (data && data.url) || 'nothing';
    let observer = __downloadCallbacks[key];
    observer.execute(data.url, data.filename, data.success, data.tabId);
    delete __downloadCallbacks[key];
  }
);

class DownloadUtils {
  static downloadImages(cssContainer) {

  }
}