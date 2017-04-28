class Html {

  // 从页面删除元素列表
  //  crawler.remove(['img', 'a', 'div.ad']);
  //  crawler.remove('div.ad');
  static remove(cssFilter) {
    if( cssFilter instanceof Array && cssFilter.length > 0 ) {
      cssFilter.map(function(el){
        Html.removeElement(el);
      });
    }
    else {
      Html.removeElement(cssFilter);
    }
  }

  // 从页面删除一个元素
  static removeElement(cssFilter) {
    if( typeof cssFilter == 'string' ) {
      if( cssFilter.match(/\//)) {
        let arr = cssFilter.split('/');
        if( arr instanceof Array && arr.length > 0 ) {
          for( let i = 0; i < arr.length; i ++ ) {
            $(arr[i]).remove();
          }
        }
      }
      else {
        $(cssFilter).remove();
      }
    }
  }
}