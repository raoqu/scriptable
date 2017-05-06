let ScCrawlerOption = {
		excludes: ['.advertise'],
		delay: 0,
		interval: 1,
		onFork: function(api, times, data, parentTabId){},
		onPageLoad: function(api, times){},
		onContentReady: function(api, times){},
		process: function(api, times){},
		postProcess: function(api, times){},
		abort: function(api, times) {},
		complete: function(api, times) {}
}

/**
 * 爬虫执行顺序
 *   1. delay
 *   2. check / interval 循环直到 check 返回非 false
 *   3. preProcess
 *   4. download
 *   5. content
 *   6. store
 */
class ScCrawler {
	constructor(options) {
		this.options = options || {};
		this.content = {};
		this.state = new ScCrawlerInnerState();
		this.tasks = ['prepare', 'init', 'preprocess', 'process', 'waitDownload', 'store', 'complete'];
		this.api = new ScCrawlerApi(this);
		this.delay = DefaultUtils.number(this.options.delay, 0);
		this.interval = DefaultUtils.number(this.options.interval, 1);
		this.onceEntry = {};
		// init state
		this.parentTabId = undefined;
		this.initData = undefined;
		// prepare state
		this.blockState = {};
		this.firstInit();
	}
	
	// 爬虫入口
	crawl() {
		this.stage();
	}

	currentStage() {
		return this.tasks.length > 0 ? this.tasks[0] : undefined;
	}

	stage() {
		// 分发步骤回调函数
		let ret = this.stageDistribute();
		// 每一个过程，如果回调返回false都会终结整个爬取过程
		if ( ret === false ) {
			terminate();
		}

		if( this.willBlock('__internalDelay') ) {
			this.state.times ++;
			return this.delayCurrentStage(this.state.delayMs || 100);
		}

		if( this.willBlock()) {
			return this.delayCurrentStage(this.interval);
		}

		return this.nextStage();
	}

	stageDistribute() {
		var stageName = this.currentStage();
		if( stageName == 'prepare') {
			return this.stageCall(this.innerStagePrepare, this);
		}
		if( stageName == 'init') { 
			return this.stageCall(this.options.onPageLoad);
		}
		else if( stageName == 'preprocess') { 
			return this.stageCall(this.options.onContentReady);    
		}
		else if( stageName == 'process') { 
			let ret = this.stageCall(this.options.process);
			return ret;
		}
		else if( stageName == 'waitDownload') {
			return this.stageCall(this.waitDownload, this);
		}
		else if( stageName == 'store') {
			return this.stageCall(this.options.store, this);
		}
		else if( stageName == 'complete') { 
			let ret = this.stageCall(this.options.complete)

			if( ! this.willBlock()) {
				let theData = this.parentData || {};
				theData.currentUrl = window.location.href;
				Extension.sendToTab(this.parentTabId, 'child_complete', theData, function(){
					window.close();
				});
			}

			return ret;
		}
		return undefined;
	}

	stageCall(callback, who) {
		let stageName = this.currentStage();
		let times = this.state.times;
		//console.log(stageName + '---------');
		let ret = ScCallback(callback, who||this.options, this.api, times);
		return ret;
	}

	block(flag) {
		this.blockState[flag] = true;
	}

	clear(flag) {
		delete this.blockState[flag];
	}

	willBlock(flag) {
		if( flag ) {
			return !! this.blockState[flag];
		}
		return !BaseUtils.isEmpty(this.blockState);
	}

	watchLogMessages() {
		Extension.onTabMessage('__crawlerLog', function(data) {
			console.log(data);
		});
	}

	firstInit() {
		this.block('getParentData');
		if( this.options.multiple ) {
			this.block('getTabData');
			this.watchLogMessages();
		}
	}

	getParentCrawlerTabData() {
		let self = this;
		Extension.getParentTabData(function(parentTabId, attachedData){
			if( parentTabId ) {
				self.parentData = attachedData;
				self.parentTabId = parentTabId;
			}
			self.clear('getParentData');
		});
	}

	getSavedCrawlerTabData() {
		let self = this;
		if( this.options.multiple) {
			Extension.remove('__crawlerData', function(savedData){
				let data = undefined;
				if( savedData ) {
					data = savedData;
					data.times ++;
				}
				else {
					data = self.options.initData || {};
					data.times = 0;
				}

				self.tabData = data;
				Extension.set('__crawlerData', data, function(){
					self.clear('getTabData');
				});
			});
		}
	}

	// first step, check whether this crawler created by parent tab or 
	innerStagePrepare(api, times) {
		let self = this;

		this.once('innerStagePrepare', function(){
			self.getParentCrawlerTabData();
			self.getSavedCrawlerTabData();
		});

		if( this.willBlock('getParentData') || this.willBlock('getTabData')) {
			return api.delay(1);
		}
		
		this.once('onFork', function() {
			ScCallback(self.options.onFork, self, self.api, self.state.times, self.tabData, self.parentData, self.parentTabId);
		});
	}

	stageClearState() {
		this.clear('__internalDelay');
	}

	once(key, callback) {
		if( ! this.onceEntry[key] ) {
			this.onceEntry[key] = true;
			ScCallback(callback, this);
		}
	}

	delayCurrentStage(delayMs) {
		this.stageClearState();
		if( !delayMs) {
			return this.stage();
		}

		setTimeout(  this.stage.bind(this), delayMs);
	}

	// go next stage
	nextStage() {
		this.state.times = 0;
		this.tasks && this.tasks.length && this.tasks.shift();
		this.delayCurrentStage(this.interval);
	}

	onDownloadBegin() {
		this.state.download = true;
	}

	// wait download to be complete
	waitDownload(api, times) {
		if( this.state.download) {
			return api.delay(50);
		}
	}

	onFileDownload(task, result) {
	}

	onBatchDownload(batchId) {
		this.state.download = false;
	}
}

// 爬虫内部状态
class ScCrawlerInnerState {
	constructor() {
		this.state = 'init';
		this.times = 0; // 在当前状态已执行的次数，每次 api.delay 加1
	}
}

class ChildTabPool extends BatchTaskPool {
	constructor(limit) {
		super(limit);
		this.resolveMapping = {};
	}

	process(taskId, task, resolve) {
		let url = task.url;
		let self = this;
		Extension.createTab(url, false, false, task, function(){
			self.resolveMapping[taskId] = resolve;
			Extension.onTabMessage('child_complete', self.onChildTabComplete.bind(self));
		})
	}

	onChildTabComplete(data) {
		let task = data;
		let taskId = task.id;
		let url = task.url;
		let resolve = this.resolveMapping[taskId];
		delete this.resolveMapping[taskId];
		resolve(url);
	}
}

var CHILD_TAB_POOL = new ChildTabPool(1);

// 爬虫API方法，提供给通过参数传入的回调方法
class ScCrawlerApi {
	constructor(crawler) {
		this.crawler = crawler;
		this.tabPool = new ChildTabPool(1);
		this.resolveMapping = {};
		this.apiOnceEntry = {};
	}

	next() {
		this.crawler.nextStage();
	}

	html(node) {
		return $(node).html();
	}

	remove() {
		if( filters && filters.length > 0) {
			filters.map(function(el){
				$(el).remove();
			});
		}
	}

	log(content) {
		Extension.sendToTab(this.crawler.parentTabId, '__crawlerLog', content);
	}

	delay(millionSeconds) {
		let crawler = this.crawler;
		crawler.block('__internalDelay');
		crawler.state.delayMs = millionSeconds || 100;
	}

	// batch download tasks
	download(tasks, callback, batchCallback) {
		let crawler = this.crawler;

		let onSingleFileDownload = function(task, result){
			ScCallback(crawler.onFileDownload, crawler, task, result);
			//try { ScCallback(callback, crawler, task); } catch(err) { console.log('error api.download callback'); }
			ScCallback(callback, crawler, task, result);
		}
		let onBatchFileDownload = function(batchId) {
			ScCallback(crawler.onBatchDownload, crawler, batchId);
			//try { ScCallback(batchCallback, crawler, batchId); } catch(err) { console.log('error api.download batchCallback'); }
			ScCallback(batchCallback, crawler, batchId);
		}

		let batchId = BaseUtils.uniqId();
		DownloadUtils.batchDownload(batchId, tasks, callback, onBatchFileDownload);
	}

	// downloadImages
	downloadImages(node, folder, callback, batchCallback) {
		let self = this;
		let crawler = this.crawler;
		folder = folder || 'scriptable';

		crawler.onDownloadBegin();


		let onSingleFileDownload = function(task, result){
			ScCallback(crawler.onFileDownload, crawler, task, result);
			//try { ScCallback(callback, crawler, task); } catch(err) { console.log('error api.download callback'); }
			ScCallback(callback, crawler, task, result);
		}
		let onBatchFileDownload = function(batchId) {
			ScCallback(crawler.onBatchDownload, crawler, batchId);
			//try { ScCallback(batchCallback, crawler, batchId); } catch(err) { console.log('error api.download batchCallback'); }
			ScCallback(batchCallback, crawler, batchId);
		}

		let batchId = BaseUtils.uniqId();
		DownloadUtils.downloadImages( batchId, node, folder, onSingleFileDownload, onBatchFileDownload);
	}

	setForkCount(limit) {
		this.tabPool.setCount(limit);
	}

	// open a group of child tabs to finish linked crawling (with a tab pool)
	// max tab count can be set by api.setForkCount(count)
	createChildTabs(batchId, tasks, callback, batchCallback) {
		if( ! this.crawler.options.multiple) {
			throw('options.multiple must been set');
		}
		this.tabPool.addBatch(batchId, tasks, callback, batchCallback);
	}

	close() {
		this.crawler.blockState = {}
	}

	block(flag) {
		this.crawler.block(flag);
	}

	clear(flag) {
		this.crawler.clear(flag);
	}

	once(key, callback) {
		if( ! this.apiOnceEntry[key] ) {
			this.apiOnceEntry[key] = true;
			ScCallback(callback, this);
		}
	}
}

function extentionCrawl(scCrawlerOption) {
	let crawler = new ScCrawler(scCrawlerOption);
	crawler.crawl();
}