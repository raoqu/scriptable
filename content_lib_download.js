var __download_watcher = false;
var DOWNLOAD_DISPATCHER = new CallbackDispatcher();

class DownloadTask {
	constructor(id, url, filename) {
		this.id = id || BaseUtils.uniqId();
		this.url = url;
		this.filename = filename;
	}

	static create(url, folder) {
		let absUrl = UrlUtils.resolve(url);
		let id = absUrl;
		let filename = UrlUtils.resolveFilePath(absUrl, folder, true);
		return new DownloadTask(id, absUrl, filename);
	}
}

class DownloadUtils {

	// download single file
	// @see DownloadTask
	static download(task, callback) {
		callback && DownloadUtils.watchDownloadEvent();

		DOWNLOAD_DISPATCHER.addCallback(task.id, callback);
		// notify background page to download file
		Extension.sendMessage('downloadFile', task);
	}

	//
	// DownloadUtils.downloadImages('batchId', '.className', 'folder',
	//   function(taskId, task){ console.log(task.id); },
	//   function(batchId){ console.log(batchId); }
	// );
	static downloadImages(batch_id, cssFilter, folder, callback, batchCallback) {

		let tasks = DownloadUtils.parseImageTasks(cssFilter, folder);
		DownloadUtils.batchDownload(batch_id, tasks, callback, batchCallback );

		return tasks;
	}

	// batch download files (task type: DownloadTask)
	static batchDownload(batch_id, tasks, callback, batchCallback) {
		if( ! BaseUtils.isArray(tasks)) {
			throw 'DownloadUtils.batchDownload: tasks must be an array';
		}

		tasks.batchId = batch_id;
		let innerBatchCallback = function(){
			ScCallback(batchCallback, this, batch_id, tasks.length);
		}

		if( tasks.length > 0 ) {
			BATCH_DOWNLOAD_MANAGER.addBatch(batch_id, tasks, callback, innerBatchCallback );
		}
		else {
			// nothing to be download
			innerBatchCallback();
		}
	}

	// listen file download complete notify
	static watchDownloadEvent() {
		if( __download_watcher )
			return;

		__download_watcher = true;

		// data.{tabId, url, filename, success}
		Extension.onMessage(
			'onFileDownload',
			function(result){
				// result.id = task.id
				DOWNLOAD_DISPATCHER.dispatchOnce(result && result.id, result);
			}
		);
	}

	static parseImageTasks(cssFilter, folder) {
		let imgs = $(cssFilter).find('img');
		let tasks = [];

		BaseUtils.each(imgs, function(img){
			let image = $(img);
			let url = image.attr('src');
			if( url ) {
				let task = DownloadTask.create(url, folder);
				tasks.push(task);
			}
		});

		return tasks;
	}

	static parseLinkTasks(cssFilter, folder) {
		let imgs = $(cssFilter).find('a');
		let tasks = [];

		BaseUtils.each(imgs, function(img){
			let image = $(img);
			let url = image.attr('href');
			if( url ) {
				let task = DownloadTask.create(url, folder);
				tasks.push(task);
			}
		});

		return tasks;
	}

	static mergeTasks(var_tasks) {
		let set = new LinkedSet();
		let tasks = [];
		BaseUtils.each(arguments, function(array){
			BaseUtils.each(array, function(task){
				if( set.push(task.id)) {
					tasks.push(task);;
				}
			});
		});

		return tasks;
	}
}

// download manager
class BatchDownloadManager extends BatchTaskPool {
	constructor(limit) {
		super(limit);
	}

	// @override: process one task
	process(taskId, task, resolve) {
		let self = this;
		// download a single file
		DownloadUtils.download(
			task, 
			// fix: this.onFileDownloadFinished.bind(this, taskId, task, resolve)
			// pass the result dispatched from 'watchDownloadEvent', but not the task from TaskPool
			function(downloadResult) {
				ScCallback(self.onFileDownloadFinished, self, taskId, task, downloadResult, resolve);
			}
		);
	}

	// @see MergeableTaskPool
	onFileDownloadFinished(taskId, task, result, resolve) {
		resolve(result);
	}

	onTaskPoolEmpty() {
	}
}

var BATCH_DOWNLOAD_MANAGER = new BatchDownloadManager(3);
 