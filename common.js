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

var base_util_RandomSource = [
  '0','1','2','3','4','5','6','7','8','9',
  'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
  'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'
];

class BaseUtils {
  // is val undefined
  static isValueUndefined(val) {
    return typeof(val) == "undefined";
  }

  // is val null value
  static isValueNull(val) {
    return !val && typeof(val)!="undefined" && val!=0;
  } 

  // generate random string with specified length
  static randomString(n) {
     let res = "";
     let max = base_util_RandomSource.length - 1;
     for(var i = 0; i < n ; i ++) {
         var id = Math.ceil(Math.random()*max);
         res += base_util_RandomSource[id];
     }
     return res;
  }

  // generate weak uniq id 
  // RFC4122(https://www.ietf.org/rfc/rfc4122.txt)
  // e.g. "3bce4931-6c75-41ab-afe0-2ec108a30860"
  static uniqId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
    //return BaseUtils.randomString(64);
  }

  // is object/array empty
  static isEmpty(obj) {
    let hasOwnProperty = Object.prototype.hasOwnProperty;

    // null and undefined are "empty"
    if (obj == null) return true;

    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;

    // If it isn't an object at this point
    // it is empty, but it can't be anything *but* empty
    // Is it empty?  Depends on your application.
    if (typeof obj !== "object") return true;

    // Otherwise, does it have any properties of its own?
    // Note that this doesn't handle
    // toString and valueOf enumeration bugs in IE < 9
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }

    return true;
  }
}

function extensionAjaxPost(url, data, callback) {
  $.ajax({
    type: 'POST',
    url: url,
    contentType: 'application/json',
    dataType: 'json',
    data: data,
    success: function(data) {
      if( callback )
        callback(data);
    }
  })
}

class DefaultUtil {
  
  static number(val, defaultVal) {
    if( typeof val == 'number') {
      return val;
    }

    return defaultVal;
  }
}

class QuUtils {
  static appendUndefined(array, src) {

  }
}