
class Html {

  // Remove dom elements from document
  //  Html.remove(['img', 'a', 'div.ad']);
  //  Html.remove('div.ad');
  static remove(filters) {
    HtmlInnerService.distribute(filters, function(nodes) { nodes.remove(); } );
  }
  // hide dom elements in document
  static hide(filters) {
    HtmlInnerService.distribute(filters, function(nodes) { nodes.hide(); } );
  }
  // hide dom elements in document
  static show(filters) {
    HtmlInnerService.distribute(filters, function(nodes) { nodes.show(); } );
  }

  static click(filters) {
    HtmlInnerService.distribute(filters, function(nodes) {
      Html.dispatchMouseEvent(nodes[0], 'click', true, true);
    });
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

  static distribute(cssFilterArray, callback) {
    if( cssFilterArray instanceof Array && cssFilterArray.length > 0 ) {
      cssFilterArray.map(function(cssFilter){
        HtmlInnerService.process($(cssFilter), callback);
      });

    }
    else {
      var cssFilter = cssFilterArray;
      HtmlInnerService.process($(cssFilter), callback);
    }
  }

  // callback(jqNodes)
  static process(jqNodes, callabck) {
    if( jqNodes ) {
      ScCallback(callabck, 1, jqNodes);
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

class NetworkUtils {
  // ajax post
  static post(url, data, callback) {
    $.ajax({
      type: 'POST',
      url: url,
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify(data||{}),
      success: function(data) {
        ScCallback(callback, this, true, data);
      },
      error: function() {
        ScCallback(callback, this, false, null);
      }
    })
  }
}