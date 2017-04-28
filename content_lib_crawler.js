let ScCrawlerOption = {
    excludes: ['.advertise'],
    delay: 0,
    interval: 100,
    check: function(crawler){},
    preProcess: function(crawler){},
    process: function(crawler){},
    postProcess: function(crawler){},
    data: {}
}

function ScHideElements(filters) {
  if( filters && filters.length > 0) {
    filters.map(function(el){
      $(el).hide();
    });
  }
}

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

  download(node) {
    return $(node).find('img');
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
    this.tasks = ['delay', 'check', 'pre', 'download', 'content', 'store', 'complete'];
    this.api = new ScCrawlerApi(this);
    this.delay = Default.number(this.options.delay, 0);
    this.interval = Default.number(this.options.interval, 100);
    this.data = false;
  }
  
  // 爬虫入口
  crawl() {
    this.stage();
  }

  currentStage() {
    return this.tasks.length > 0 ? this.tasks[0] : undefined;
  }

  stage() {
    let stageName = this.currentStage();
    if( stageName == 'delay') {
      this.__delay();
    }
    else if( stageName == 'check') {
      this.__check();
    }
    else if( stageName == 'pre') {
      this.__preProcess();
    }
    else if( stageName == 'content') {
      this.__content();
    }
    else if( stageName == 'download') {
      this.__download();
    }
    else if( stageName == 'store') {
      this.__store();
    }
    else if( stageName == 'complete') {
      this.__complete();
    }
  }

  stageCheck() {
    return true;
  }

  delayCurrentStage(delayMs) {
    setTimeout(function(){
      this.stage,
      delayMs
    });
  }

  nextStage() {
    if( this.stageCheck()) {
      this.tasks.shift();
      this.stage();
    }
    else {
      setTimeout(function(){
        this.nextStage,
        this.interval
      })
    }
  }

  // 1. delay
  __delay() {
    let self = this;
    if( this.delay > 0) {
      this.delayCurrentStage(this.delay);
      return;
    }

    self.nextStage();
  }

  // 2. check ready state - interval loop
  __check() {
    let options = this.options;
    if( ScCallback(options.check, this) === false) {
      this.delayCurrentStage(this.interval);
      return false;
    }

    this.nextStage();
  }

  __preProcess() {
    let options = this.options;
    console.log('remove')
    Html.remove(options.excludes);

    if( ScCallback(options.preProcess, this) === false ) {
      this.__complete();
      return false;
    }

    this.nextStage();
  }

  __content() {
    let data = ScCallback(options.process, this);
    if( data === false ) {
      this.__complete();
      return false;
    }

    this.data = data;
    this.nextStage();
  }

  __download() {
    this.nextStage();
  }

  __store() {
    this.nextStage();
  }

  __complete() {
    ScCallback(options.postProcess, this);
    console.log('complete');
  }
}

function extentionCrawl(scCrawlerOption) {
  let crawler = new ScCrawler(scCrawlerOption);
  crawler.crawl();
}