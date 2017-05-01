
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
    args.unshift(callbacks);

    CallbackDispatcher.dispatch.apply(this, args);
  }

  // 
  static dispatch(callbacks, var_args) {
    let self = this;
    
    BaseUtils.each(callbacks, function(callback){
      var args = [];
      Array.prototype.push.apply( args, arguments );
      args.shift();

      callback.apply(self||{}, args);
    })
  }
}

/*
  var pool = new MergeablePool( { 
    limit: 5, 
    process: function(key, data, resolve){ console.log('run:' + data.id); resolve(); },
    complete: function() { console.log('tasks completed'); }
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
  resolve(key) {
    if( this.running.get(key)) {
      this.running.remove(key);
      this.active --;
      // call the complete callback while no more tasks need to be schedule
      if( this.active == 0 && this.queue.isEmpty() ) {
        return this.complete();
      }
    }

    setTimeout( this.schedule.bind(this), 10);
  }

  // call the complete callback while no more tasks need to be schedule
  complete() {
      ScCallback(this.options.complete, this);
  }
}