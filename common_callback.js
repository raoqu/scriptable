function ScCallback(callback, self) {
  if( callback ) {
    if( ! self ) {
      throw '"ScCallback" failed, for param "self" cannot be empty.';
    }
    var args = [];
    Array.prototype.push.apply( args, arguments );
    args.shift();
    var obj = args.shift();
    return callback.apply(self||this, args);
  }
}

class MessageQueue {
  constructor() {
    this.__message_map = {};
  }

  dispatch() {
  }
}

var __message_describe_groups = {};
var globalMessages = new MessageQueue();

// Message management
class MessageManagement {

  // dispatch message callback
  static dispatch(message, group) {
  }
}