var __single_download_meta_group = new MetaTree(); // single file download
var __batch_download_meta_group = new MetaTree(); // batch file download, single stored int __batch_download_meta_group.metadata (@See MetaTree)
var __download_watcher = false;
const DOWNLOAD_GROUP_SPLIT = '{DownloadGroup}/';

class DownloadTask {
	constructor(id, url, filename) {
		this.id = id || BaseUtils.uniqId();
		this.url = url;
		this.filename = filename;
	}

	static create(url, folder) {
		let absUrl = UrlUtils.resolve(url);
		let id = absUrl;
		let filename = UrlUtils.resolveFilePath(absUrl, folder);
		return new DownloadTask(id, absUrl, filename);
	}
}

class DownloadUtils {

	// download single file
	// @see DownloadTask
	static download(task, callback, obj) {
		callback && DownloadUtils.watchDownloadEvent();

		CallbackDispatcher.addCallback(task, callback);
		__single_download_meta_group[task.id] = task;

		Extension.sendMessage('downloadFile', task);
	}

	// batch download files 
	// @see MetaTree
	static batchDownload(group_id, tasks, callback, groupCallback, obj) {
		// merge if download batch already existed
		let batch = __batch_download_meta_group.get(group_id) || new MetaTree();
		batch.merge(tasks);

		// group callback
		CallbackDispatcher.addCallback(batch, groupCallback);
		__batch_download_meta_group.add(batch);

		// download each file
		BaseUtils.each(tasks, function(item){
			DownloadUtils.download(item, callback, obj);
		});
	}

	static downloadImages(group_id, cssFilter, folder, callback, groupCallback, obj) {
		let imgs = $(cssFilter).find('img');
		let tasks = [];

		BaseUtils.each(imgs, function(img){
			let image = $(img);
			let url = image.attr('src');
			tasks.push( DownloadTask.create(url, folder));
		});

		if( tasks.length > 0 ) {
			DownloadUtils.batchDownload(group_id, tasks, callback, groupCallback, obj);
		}
		return tasks.length;
	}

	// listen file download complete notify
	static watchDownloadEvent() {
		if( __download_watcher )
			return;

		__download_watcher = true;

		// data.{tabId, url, filename, success}
		Extension.onMessage(
			'onFileDownload',
			function(data){
				console.log(data);
			}
		);
	}
}
