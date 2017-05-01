
class Html {

  // Remove dom elements from document
  //  Html.remove(['img', 'a', 'div.ad']);
  //  Html.remove('div.ad');
  static remove(cssFilterArray) {
    return HtmlInnerService.distribute(cssFilterArray, 'remove');
  }
  // hide dom elements in document
  static hide(cssFilterArray) {
    return HtmlInnerService.distribute(cssFilterArray, 'hide');
  }
  // hide dom elements in document
  static show(cssFilterArray) {
    return HtmlInnerService.distribute(cssFilterArray, 'show');
  }
  // enumerate all image url in elements
  static enumerateImages(cssFilterArray) {
  }

  // dispatch mouse event on specified dom
  // e.g.  Html.dispatchMouseEvent($('#id')[0], 'mouseover', true, true);
  // e.g.  Html.dispatchMouseEvent($('#id')[0], 'mousedown', true, true);
  // e.g.  Html.dispatchMouseEvent($('#id')[0], 'click', true, true);
  // e.g.  Html.dispatchMouseEvent($('#id')[0], 'mouseup', true, true);
  static dispatchMouseEvent(target, var_args) {
    var e = document.createEvent("MouseEvents");
    // If you need clientX, clientY, etc., you can call
    // initMouseEvent instead of initEvent
    e.initEvent.apply(e, Array.prototype.slice.call(arguments, 1));
    target.dispatchEvent(e);
  };
  // e.g.  var canceled = ! Html.dispatchKeyboardEvent(el, 'keydown', true, true, null, 'h', 0, ''); 
  //            // type, bubble, cacelable, window, key, 
  //            // location (0=standard, 1=left, 2=right, 3=numpad, 4=mobile, 5=joystick)
  //            // space-sparated (Shift, Control, Alt, etc)
  // e.g.  Html.dispatchKeyboardEvent(el, 'keypress', true, true, null, 'h', 0, ''); 
  static dispatchKeyboardEvent(target, initKeyboradEvent_args) {
    var e = document.createEvent("KeyboardEvents");
    e.initKeyboardEvent.apply(e, Array.prototype.slice.call(arguments, 1));
    target.dispatchEvent(e);
  };
  // e.g.  Html.dispatchTextEvent(element, 'textInput', true, true, null, 'h', 0)
  static dispatchTextEvent(target, initTextEvent_args) {
    var e = document.createEvent("TextEvent");
    e.initTextEvent.apply(e, Array.prototype.slice.call(arguments, 1));
    target.dispatchEvent(e);
  };
  // e.g.  Html.dispatchSimpleEvent(element, 'input', false, false);
  // e.g.  Html.dispatchSimpleEvent(element, 'change', false, false);
  static dispatchSimpleEvent(target, type, canBubble, cancelable) {
    var e = document.createEvent("Event");
    e.initEvent.apply(e, Array.prototype.slice.call(arguments, 1));
    target.dispatchEvent(e);
  };
}

// html dom 内部服务
class HtmlInnerService {

  static distribute(cssFilterArray, type) {
    if( cssFilterArray instanceof Array && cssFilterArray.length > 0 ) {
      cssFilterArray.map(function(cssFilter){
        HtmlInnerService.removeElement(cssFilter, type);
      });

    }
    else {
      var cssFilter = cssFilterArray;
      HtmlInnerService.removeElement(cssFilter, type);
    }
  }

  // 处理单个css选择器操作
  static removeElement(cssFilter, type) {
    if( typeof cssFilter == 'string') {
      try {
        if( type == 'remove') {
          return $(cssFilter).remove();
        }

        if( type == 'hide') {
          return $(cssFilter).hide();
        }

        if( type == 'show') {
          return $(cssFilter).show();
        }
      }
      catch(err) {
        console.log('element operate failed: ' + cssFilter + ' [' + type + ']');
      }
    }
  }
}

class NetworkUtil {
  // ajax post
  static post(url, data, callback) {
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
}