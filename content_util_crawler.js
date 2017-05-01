let ScCrawlerOption = {
    excludes: ['.advertise'],
    delay: 0,
    interval: 100,
    onPageLoad: function(api, times){},
    onContentReady: function(api, times){},
    process: function(api, times){},
    postProcess: function(api, times){},
    onFileDownload: function(task){},
    onDownloadComplete: function(batchId){},
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
    this.tasks = ['init', 'preprocess', 'process', 'waitDownload', 'store', 'complete'];
    this.api = new ScCrawlerApi(this);
    this.delay = DefaultUtil.number(this.options.delay, 0);
    this.interval = DefaultUtil.number(this.options.interval, 10);
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

    if( this.state.delay ) {
      this.state.times ++;
      return this.delayCurrentStage(this.state.delayMs || 100);
    }
    else {
      return this.nextStage();
    }
  }

  stageDistribute() {
    var stageName = this.currentStage();
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
    else if( stageName == 'complete') { 
      return this.stageCall(this.options.complete);    
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

  stageClearState() {
    this.state.delay = false;
  }

  delayCurrentStage(delayMs) {
    this.stageClearState();
    if( !delayMs) {
      //return this.stage();
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

  onFileDownload(task) {
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

// 爬虫API方法，提供给通过参数传入的回调方法
class ScCrawlerApi {
  constructor(crawler) {
    this.crawler = crawler;
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

  delay(millionSeconds) {
    var state = this.crawler.state;
    state.delay = true;
    state.delayMs = millionSeconds || 100;
  }

  // batch download tasks
  download(tasks, callback, batchCallback) {
    let crawler = this.crawler;

    let onSingleFileDownload = function(task){
      ScCallback(crawler.onFileDownload, crawler, task);
      //try { ScCallback(callback, crawler, task); } catch(err) { console.log('error api.download callback'); }
      ScCallback(callback, crawler, task);
    }
    let onBatchFileDownload = function(batchId) {
      ScCallback(crawler.onBatchDownload, crawler, batchId);
      //try { ScCallback(batchCallback, crawler, batchId); } catch(err) { console.log('error api.download batchCallback'); }
      ScCallback(batchCallback, crawler, batchId);
    }

    let batchId = BaseUtils.uniqId();
    DownloadUtils.batchDownload(batchId, tasks, onSingleFileDownload, onBatchFileDownload);
  }

  // downloadImages
  downloadImages(node, folder, callback, batchCallback) {
    let self = this;
    let crawler = this.crawler;
    folder = folder || 'scriptable';

    crawler.onDownloadBegin();


    let onSingleFileDownload = function(task){
      ScCallback(crawler.onFileDownload, crawler, task);
      //try { ScCallback(callback, crawler, task); } catch(err) { console.log('error api.download callback'); }
      ScCallback(callback, crawler, task);
    }
    let onBatchFileDownload = function(batchId) {
      ScCallback(crawler.onBatchDownload, crawler, batchId);
      //try { ScCallback(batchCallback, crawler, batchId); } catch(err) { console.log('error api.download batchCallback'); }
      ScCallback(batchCallback, crawler, batchId);
    }

    let batchId = BaseUtils.uniqId();
    DownloadUtils.downloadImages( batchId, node, folder, onSingleFileDownload, onBatchFileDownload);
  }
}

function extentionCrawl(scCrawlerOption) {
  let crawler = new ScCrawler(scCrawlerOption);
  crawler.crawl();
}