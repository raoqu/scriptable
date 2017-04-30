// Meta tree
//  meta tree can be made up of meta items, and can also made up of child trees
class MetaTree {
  constructor(treeId, metaArray) {
    this.id = treeId;
    this.type = 'tree';
    this.metadata = this.merge(metaArray);
  }

  add(meta) {
    // no duplicate add meta, this's benefit to keep callbacks on the existed meta
    let oldMeta = undefined;
    if( meta && meta.id && !(oldMeta = get(meta.id)) ) {
      this.metadata[meta.id] = meta;
      return meta;
    }

    return oldMeta;
  }

  remove(metaId) {
    delete this.metadata[metaId];
  }

  get(metaId) {
    return this.metadata[metaId];
  }

  isEmpty() {
    return BaseUtils.isEmpty(this.metadata);
  }

  merge(array) {
    return BaseUtils.arrayToObject(array, 'id', this.metadata);
  }
}

// Meta Item prototype, infact meta item can be anything has a 'id' field
class MetaItem {
  constructor(id) {
    this.id = id;
    this.type = 'item';
  }
}

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
  // add a callback to a meta object
  static addCallback(meta, callback) {
    if( ! meta ) return;

    this.callbacks = this.callbacks || [];
    this.singletonCallbacks = this.singletonCallbacks || {};
    // no duplicate callback added
    if( ! this.singletonCallbacks[callback]) {
      this.singletonCallbacks[callback] = true;
      this.callbacks.push(callback);
    }
  }

  // dispatch callbacks bound on meta object
  static dispatch(meta, self, var_args) {
    meta && 
    BaseUtils.each(meta.callbacks, function(callback){
      var args = [];
      Array.prototype.push.apply( args, arguments );
      // remove 2 params (meta, self), leave var_args retained
      args.shift();
      args.shift();
      args.push(meta);

      callback.apply(self||meta, args);
    })
  }

  // 
  static dispatchWithResultProcess(meta, self, resultProc, var_args) {
    meta && 
    BaseUtils.each(meta.callbacks, function(callback){
      var args = [];
      Array.prototype.push.apply( args, arguments );
      // remove 3 params (meta, self, resultProc), leave var_args retained
      args.shift();
      args.shift();
      args.shift();
      args.push(meta);

      callback.apply(self||meta, args);
      ScCallback(resultProc, )
      if( resultProc ) {
        resultProc.call(self, ret);
      }
    })
  }
}