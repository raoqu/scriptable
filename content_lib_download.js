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
		let filename = UrlUtils.resolveFilePath(absUrl, folder);
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
	//   function(task){ console.log(task.id); },
	//   function(batchId){ console.log(batchId); }
	// );
	static downloadImages(batch_id, cssFilter, folder, callback, batchCallback) {

		let tasks = DownloadUtils.parseImageTasks(cssFilter, folder);
		DownloadUtils.batchDownload(batch_id, tasks, folder,callback, batchCallback );

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
			BATCH_DOWNLOAD_MANAGER.batchDownload(batch_id, tasks, callback, innerBatchCallback );
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
			function(task){
				DOWNLOAD_DISPATCHER.dispatchOnce(task && task.id, task);
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
class BatchDownloadManager {
	constructor() {
		this.callbacks = new MapArray(); // { taskId: [ callabck ... ] }
		this.taskBatches = new MapArray(); // { taskId: [ batchId ... ] }
		this.batchCallbacks = {}; // { batchId: batchCallback }
		this.batchTasks = {}; // { batchId: { taskId: } }
		this.taskPool = new MergeableTaskPool({
			limit: 5,
			process: this.downloadSingle.bind(this),
			complete: this.onTaskPoolEmpty.bind(this)
		});
	}

	// batch download files 
	batchDownload(batchId, tasks, callback, batchCallback) {
		// map batchId to {taskId:true}
		let batchTaskMap = this.batchTasks[batchId] || {};
		let manager = this;

		BaseUtils.each(tasks, function(task){
			manager.callbacks.add(task.id, callback);
			manager.taskPool.push(task.id, task);
			manager.taskBatches.add(task.id, batchId);
			batchTaskMap[task.id] = true;
		});

		this.batchTasks[batchId] = batchTaskMap;
		this.batchCallbacks[batchId] = batchCallback;
	}

	// download single file
	downloadSingle(taskId, task, resolve) {
		DownloadUtils.download(task, this.onFileDownload.bind(this, taskId, task, resolve));
	}

	// @see MergeableTaskPool
	onFileDownload(taskId, task, resolve) {

		let self = this;
		let callbacks = this.callbacks.remove(taskId);
		let taskBatches = this.taskBatches.get(taskId);
		BaseUtils.each(callbacks, function(callback){
			ScCallback(callback, self, task);
		})

		// remove taskId 
		BaseUtils.each(taskBatches, function(batchId){
			let batchIds = self.batchTasks[batchId];
			if( batchIds ) {
				delete batchIds[taskId];
				if( BaseUtils.isEmpty(batchIds)) {
					let batchCallback = self.batchCallbacks[batchId];
					delete self.batchCallbacks[batchId];
					ScCallback(batchCallback, self, batchId);
				}
			}
		});

		resolve();
	}

	onTaskPoolEmpty() {
	}
}

var BATCH_DOWNLOAD_MANAGER = new BatchDownloadManager();
