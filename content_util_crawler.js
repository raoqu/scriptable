let ScCrawlerOption = {
		excludes: ['.advertise'],
		interval: 1,
		multiple: true,
		init: function(api, times, data, parentTabId){},
		complete: function(api, times) {}
}

class ScCrawlerState {
	constructor() {
		this.states = ['prepare', 'init', 'complete'];
		this.customStates = [];
		this.currentState = this.states[0];
		this.stateFrom = 'default'; // default, custom
		this.times = 0;
	}

	nextState() {
		this.times = 0;
		if( this.currentState ) {
			if( this.stateFrom == 'default' ) {
				this.states.shift();
			}
			else if( this.stateFrom == 'custom' ){
				this.customStates.shift();
			}
			this.currentState = undefined;
			this.stateFrom = 'none';
		}

		if( this.customStates.length ) {
			this.stateFrom = 'custom';
			this.currentState = this.customStates[0];
		}
		else if( this.states.length) {
			this.stateFrom = 'default';
			this.currentState = this.states[0];
		}

		return this.currentState;
	}

	addCustomState(state) {
		if( state ) {
			this.customStates.push(state);
		}
	}

	isCustomState() {
		return this.stateFrom == 'custom';
	}

	increaseCount() {
		this.times ++;
	}
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
		this.state = new ScCrawlerState();
		this.api = new ScCrawlerApi(this);
		this.delay = BaseUtils.defaultNumber(this.options.delay, 0);
		this.interval = BaseUtils.defaultNumber(this.options.interval, 1);
		this.onceEntry = {};
		// init state
		this.parentTabId = undefined;
		this.initData = undefined;
		// prepare state
		this.locks = {};
		this.customLocks = {};
	}
	
	// 爬虫入口
	crawl() {
		this.schedule();
	}

	currentState() {
		return this.state.currentState;
	}

	schedule() {
		// 分发步骤回调函数
		let ret = this.distribute();
		// 每一个过程，如果回调返回false都会终结整个爬取过程
		if ( ret === false ) {
			return null;
		}

		this.state.increaseCount();
		if( this.isBlocked()) {
			return this.scheduleLater();
		}

		return this.nextStage();
	}

	distribute() {
		let stateName = this.currentState();
		if( ! stateName ) {
			return false;
		}

		if( this.state.isCustomState()) {
			// custom tasks
			let func = this.options[stateName];
			if( BaseUtils.isFunction(func)) {
				return this.runState(func, this.options);
			}
		}
		else {
			if( stateName == 'prepare') {
				return this.runState(this.prepareState, this);
			}
			else if( stateName == 'init') {
				return this.runState(this.initState, this);
			}
			else if( stateName == 'complete') { 
				let ret = this.runState(this.options.complete)
				// notify parent tab that child crawler completed
				if( ! this.isBlocked() && this.parentTabId ) {
					let theData = this.parentData || {};
					theData.currentUrl = window.location.href;
					Extension.sendToTab(this.parentTabId, 'child_complete', theData, function(){
						window.close();
					});
				}

				return ret;
			}
		}
		return undefined;
	}

	runState(callback, who) {
		return ScCallback(callback, who||this.options, this.api, this.state.times);
	}

	block(flag) {
		this.locks[flag] = true;
	}

	clear(flag) {
		delete this.locks[flag];
	}

	customBlock(flag) {
		this.customLocks[flag] = true;
	}

	customClear(flag) {
		delete this.customLocks[flag];
	}

	isBlocked(flag) {
		if( flag ) {
			return !! this.locks[flag];
		}
		return !BaseUtils.isEmpty(this.locks) || !BaseUtils.isEmpty(this.customLocks);
	}

	watchLogMessages() {
		Extension.onTabMessage('__crawlerLog', function(data) {
			console.log(data);
		});
	}

	getParentCrawlerTabData() {
		let self = this;
		self.block('___getParentCrawlerTabData');
		Extension.getParentTabData(function(parentTabId, attachedData){
			if( parentTabId ) {
				self.parentData = attachedData;
				self.parentTabId = parentTabId;
			}
			self.clear('___getParentCrawlerTabData');
		});
	}

	getSavedCrawlerTabData() {
		let self = this;
		if( this.options.multiple) {
			self.block('___getSavedCrawlerTabData')
			self.watchLogMessages();
			Extension.remove('__crawlerData', function(savedData){
				let data = undefined;
				if( savedData && BaseUtils.isNumber(savedData.times)) {
					data = savedData;
					data.triggered = self.api.isManual() || data.triggered;
					data.times ++;
				}
				else {
					data = self.options.initData || {};
					data.triggered = self.api.isManual();
					data.times = 0;
				}

				self.tabData = data;
				Extension.set('__crawlerData', data, function(){
					self.clear('___getSavedCrawlerTabData');
				});
			});
		}
	}

	// first step, check whether this crawler created by parent tab or 
	prepareState(api, times) {
		let self = this;
		this.once('___crawler_prepareState', function(){
			self.getParentCrawlerTabData();
			self.getSavedCrawlerTabData();
		});
	}

	initState(api, times) {
		let self = this;
		this.once('___crawler_initState', function() {
			return ScCallback(self.options.init, self, self.api, self.state.times, self.tabData, self.parentData, self.parentTabId);
		});
	}

	once(key, callback) {
		if( ! this.onceEntry[key] ) {
			this.onceEntry[key] = true;
			ScCallback(callback, this);
		}
	}

	delaySchedule(millionSeconds) {
		this.block('__internalDelay');
		this.delay = millionSeconds || 100;
	}

	scheduleLater() {
		let delayMs = this.delay || this.interval;
		this.clear('__internalDelay');
		this.delay = 0;

		setTimeout(  this.schedule.bind(this), delayMs);
	}

	// go next state
	nextStage() {
		let state = this.state.nextState();
		if( ! state ) {
			return false;
		}
		this.scheduleLater();
	}

	onDownloadBegin() {
		this.state.download = true;
	}

	// wait download to be complete
	waitDownload(api, times) {
		if( this.state.download) {
			return this.delaySchedule(50);
		}
	}

	onFileDownload(task, result) {
	}

	onBatchDownload(batchId) {
		this.state.download = false;
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

	isManual() {
		return (GLOBAL_SCRIPTABLE_ENTRY == 'click');
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
		crawler.delaySchedule(millionSeconds);
	}

	addState(state) {
		let crawler = this.crawler;
		crawler.state.addCustomState(state);
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
		this.crawler.customLocks = {}
	}

	block(flag) {
		this.crawler.customBlock(flag);
	}

	clear(flag) {
		this.crawler.customClear(flag);
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