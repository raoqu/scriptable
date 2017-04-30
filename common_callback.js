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