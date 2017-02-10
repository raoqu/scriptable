function isValueUndefined(val) {
  return typeof(val) == "undefined";
}

function isValueNull(val) {
  return !val && typeof(val)!="undefined" && val!=0;
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