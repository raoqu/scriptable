function isValueUndefined(val) {
  return typeof(val) == "undefined";
}

function isValueNull(val) {
  return !val && typeof(val)!="undefined" && val!=0;
} 

var scCharSequence = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
function sc_RandomString(n) {
     var res = "";
     for(var i = 0; i < n ; i ++) {
         var id = Math.ceil(Math.random()*35);
         res += scCharSequence[id];
     }
     return res;
}

function ScUniqId() {
  return sc_RandomString(64);
}

var dispatchMouseEvent = function(target, var_args) {
  var e = document.createEvent("MouseEvents");
  // If you need clientX, clientY, etc., you can call
  // initMouseEvent instead of initEvent
  e.initEvent.apply(e, Array.prototype.slice.call(arguments, 1));
  target.dispatchEvent(e);
};

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

class Default {
  
  static number(val, defaultVal) {
    if( typeof val == 'number') {
      return val;
    }

    return defaultVal;
  }
}