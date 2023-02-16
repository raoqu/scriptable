
// function to call any function with specified 'this' and arguments
function ScCallback(callback, self, var_args) {
  if( callback ) {
    if( ! self ) {
      throw '"ScCallback" failed, for param "self" cannot be empty.';
    }
    var args = [];
    Array.prototype.push.apply( args, arguments );
    args.shift();
    args.shift();
    return callback.apply(self||this, args);
  }
}


// callback dispatcher
class CallbackDispatcher {
  constructor() {
    this.registry = new MapArray();
  }

  // add a callback to a meta object
  addCallback(taskId, callback) {
    this.registry.add(taskId, callback);
  }

  // dispatch callbacks bound on meta object
  dispatchOnce(taskId, var_args) {
    let callbacks = this.registry.remove(taskId);

    var args = [];
    Array.prototype.push.apply( args, arguments );
    args.shift();
    args.unshift(callbacks);

    CallbackDispatcher.dispatch.apply(this, args);
  }

  // 
  static dispatch(callbacks, var_args) {
    let self = this;
    let selfArgs = arguments;
    
    BaseUtils.each(callbacks, function(callback){
      var args = [];
      Array.prototype.push.apply( args, selfArgs );
      args.shift();

      callback.apply(self||{}, args);
    })
  }
}

/*
  var pool = new MergeablePool( { 
    limit: 5, 
    process: function(key, data, resolve){ console.log('run:' + data.id); resolve(); },
    taskCallback: function(key, data) { console.log('task ' + key + ' finished'); }
    complete: function() { console.log('task pool empty'); }
  })
*/
class MergeableTaskPool {
  constructor(options) {
    this.options = options || {};
    options = this.options;

    this.active = 0;
    this.limit = options.limit || 5;
    this.running = new MapArray();
    this.queue = new LinkedSet();
    this.cached = new MapArray();
  }

  setCount(limit) {
    this.limit = BaseUtils.defaultNumber(limit, 3);
  }

  // add a task into pool, make it queued on running pool full filled
  push(key, task) {
    // key existed in running pool, need no wait for queue
    if( this.running.get(key)) {
      return this.running.add(key, task);
    }
    // execute task at once while there's quota in running queue
    if( this.active < this.limit) {
      return this.execute(key, task);
    }
    // otherwise, queue the task to be scheduled later
    return this.cache(key, task);
  }

  // execute task at one without wating
  execute(key, task) {
    this.running.add(key, task);
    this.active ++;
    // perform the task execute process, only execute the first node of the array
    ScCallback(this.options.process, this.options, key, task, this.resolve.bind(this, key));
  }

  // add a task into queue of waiting scehduled
  cache(key, task) {
    this.queue.push(key);
    this.cached.add(key, task);
  }

  // schedule tasks to make sure the usage of running pool
  schedule() {
    let count = this.limit - this.active;
    let scheduleCount = Math.min(count, this.queue.length());
    for( let i = 0; i < scheduleCount; i ++ ) {
      let key = this.queue.shift();
      let tasks = this.cached.remove(key);
      if( tasks && tasks[0]) {
        this.execute(key, tasks[0]);
      }
    }
  }

  // mark running of key finished
  resolve(key, result) {
    if( this.running.get(key)) {
      let tasks = this.running.remove(key);
      this.active --;
      // call the complete callback while no more tasks need to be schedule
      let task = (tasks && tasks.length && tasks[0]) || {};
      this.taskFinished.call(this, key, task, result);

      if( this.active == 0 && this.queue.isEmpty() ) {
        return this.taskPoolEmpty();
      }
    }

    setTimeout( this.schedule.bind(this), 10);
  }

  taskFinished(key, task, result) {
    ScCallback(this.options.taskCallback, this, key, task, result);
  }

  // call the complete callback while no more tasks need to be schedule
  taskPoolEmpty() {
      ScCallback(this.options.complete, this);
  }
}


// task manager with task pool
// other task manager can extends this class, but need to implement the function 'process'
// BatchTaskPool demo
/*
  (function(){
    let DEMO_TASK_MANAGER = new BatchTaskPool(3);
    let tasks = [];
    for( let i = 0; i < 6; i ++ ) {
      tasks.push({
        id: 'demo-' + i,
        meta: true,
        anyField: 'anyValue'
      });
    }
    DEMO_TASK_MANAGER.addBatch('DemoBatchID', tasks, 
      function(task) {
        console.log('DemoBatch: task[' + task.id + '] complete');
      },
      function(batchId) {
        console.log('DemoBatch: batch[' + batchId + '] complete');
      }
    );
  })();
*/
class BatchTaskPool {
  constructor(limit) {
    this.callbacks = new MapArray(); // { taskId: [ callabck ... ] }
    this.taskBatches = new MapArray(); // { taskId: [ batchId ... ] }
    this.batchCallbacks = {}; // { batchId: batchCallback }
    this.batchTasks = {}; // { batchId: { taskId: } }
    this.taskPool = new MergeableTaskPool({
      limit: limit || 3,
      process: this.process.bind(this),
      taskCallback: this.onTaskComplete.bind(this),
      complete: this.onTaskPoolIdle.bind(this)
    });
  }

  setCount(limit) {
    this.taskPool.setCount(limit);
  }

  // add single task
  add(task, callback) {
    let self = this;
    this.taskPool.push(task.id, task);
    this.callbacks.add(task.id, callback);
  }

  // add batch tasks
  addBatch(batchId, tasks, callback, batchCallback) {
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

  // process single task
  process(taskId, task, resolve) {
    console.warn('method "process" should be overrided!')
    setTimeout(resolve, 10);
  }

  // single task complete
  onTaskComplete(taskId, task, result) {
    let self = this;
    let callbacks = this.callbacks.remove(taskId);
    let taskBatches = this.taskBatches.get(taskId);
    BaseUtils.each(callbacks, function(callback){
      ScCallback(callback, self, task, result);
    })

    // remove taskId 
    BaseUtils.each(taskBatches, function(batchId){
      let batchIds = self.batchTasks[batchId];
      if( batchIds ) {
        delete batchIds[taskId];
        if( BaseUtils.isEmpty(batchIds)) {
          let batchCallback = self.batchCallbacks[batchId];
          delete self.batchCallbacks[batchId];

          self.onBatchComplete.call(this, batchId, batchCallback);
        }
      }
    });
  }

  // batch complete
  onBatchComplete(batchId, batchCallback) {
    ScCallback(batchCallback, this, batchId);
  }

  onTaskPoolIdle() {
  }
}