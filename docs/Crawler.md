# 网页爬虫

在页面上实现爬虫功能，可以在Scriptable选项中使用`extensionCrawl`函数：
```
extensionCrawl({
    onPageLoad: ...
    process: ...
    store: ...
    complete: ...
})
```

options用法说明：

    - onPageLoad(api, times) 页面已加载

        在这个方法中实现页面状态的检测，如果页面上还存在正在动态加载的内容可以使用 api.delay 延迟检查;
        times表示当前步骤重复执行的次数，每次+1；
        如果页面已经加载完成可以使用 api.remove 移除页面上不需要的内容。

    - process(api, times) 正文处理，以及通过 api.batchDownload 下载图片或链接

    - store(api, times) 执行存储内容（包括通过网络请求存储到后端）

        可以通过 AjaxUtils.batchPost投递数据，确定在收到应答前通过 return this.delay(100) 保持停留在store阶段

    - complete() 完成回调


### 示例

参考 [samples/rawler01.js](https://github.com/raoqu/scriptable/blob/master/samples/crawler01.js)

```
var context = {};
extensionCrawl({
    let postTasks = [];
    let store = false;
    onFork: function(data) {
        ...
    },
    onPageLoad: function(api, times) {
        api.remove(['#banner', '.advertisement']);
    },
    process: function() {
        let imageTasks = DownloadUtils.parseImageTasks('.className', 'folder');
        api.download(
            imageTasks,
            function(task) { console.log(task.localfile); },
            function(batchId) { 
                postTasks.push({
                    id: BaseUtils.uniqId(),
                    url: 'http://localhost/storage/article',
                    data: {
                        url: window.location.href,
                        title: $('.QuestionHeader-title').text(),
                        content: $('.QuestionAnswer-content').html()
                    }
                });
                store = true;
                // post data
                AjaxUtils.batchPost(postTasks,
                    function(task) { console.log('post complete: ' + task.id); },
                    function(batchId) { 
                        store = false;
                        console.log('batch complete: ' + batchId) 
                    }
                );
            }
        );
    },
    store: function(api, times) {
        if( store) {
            return this.delay(100);
        }
        console.log('END OF STORE');
    },
    complete: function() {
        console.log('END OF CRAWLING');
    }
});
```

### 结构：


整体过程由`stage`方法分发，每次分发，options函数都会收到以下参数：

    - api api接口，设计初衷里api只有在必要的时候才由回调函数使用，一般情况下不需要显式调用
    - times 第几次进入该状态回调

爬虫的执行过程分为如下几个阶段：
```
    this.tasks = ['init', 'preprocess', 'process', 'waitDownload', 'store', 'complete'];
```
* __init__ (options接口： `onPageLoad`)

    页面加载完成，但是有些页面的内容加载是在整个页面onload以后再由js触发去动态加载的，这个时候页面内容还没有准备就绪，一般这个时候通过`api.delay`来解决。

* __preprocess__ (optionsr接口：`onContentReady`)

    通过init阶段检查完页面状态，此时所有页面元素已经就绪，可以在此阶段对页面元素内容进行加工。但是此阶段不是必要的，通常在`onPageLoad`中已经完成这些操作。

* __process__ (options接口： `process`)

    执行爬虫执行前的预处理，如果`pre`方法返回false那么会终止爬虫过程，进入到`terminate`阶段，最后再进入`complete`阶段。

* __waitDownload__

    在此前阶段通过 `api.download` 方法执行的下载任务，在此阶段需要完成等待（框架自动完成）。
    所有内容下载完成后才进入下一阶段，因此在当前阶段及之后不应该再执行下载动作

* __store__ (options接口： `store`)

    options接口： `store`

    在此阶段及此前阶段需要完成所有内容的存储，例如向服务发送 Ajax post请求。
    在post请求收到应答之前

* __complete__ (options接口： `complete`)

    触发 options 的 `complete` 回调。


### API 

API提供以下方法：

    - delay 在回调执行结束以后延迟一段时间再重试调用当前方法，参数为毫秒数 
            return api.delay(10);

    - remove 从页面删除指定的元素，参数为CSS选择器数组，
            api.remove(['.className', '#id']);

    - download 从页面下载内容
            api.download(tasks, 'folder', fileCallback, batchCallback)
            - fileCallback(task, result) 每个文件下载完成回调一次 {id, url, filename}
            - batchCallback(batchId) 整批文件下载完成后回调

            下载未完成之前不会从 download 过程进入到下一个状态
            一般情况下每个爬虫页面尽可能只使用一次download/downloadImages方法

    - downloadImages 从页面下载图片（自动解析文档）
            api.downloadImages('.className', 'folder', fileCallback, batchCallback)

此外扩展本身也提供其他工具类：

    - DownloadUtils.parseImageTasks(cssFilter)
    - DownloadUtils.parseLinkTasks(cssFilter)
    - DownloadUtils.mergeTasks(tasks1, tasks2, ...)
    - DownloadUtils.batchDownload(batchId, tasks, callback, batchCallback)
            在使用api.download进行批量下载时使用Pool管理，当前设置单个页面并发下载数量为5；
    - AjaxUtils.post(serviceUrl, dataObject, callback)
    - AjaxUtils.batchPost(tasks, callback, batchCallback)
            用于向服务端投递数据，其中数据会被转换为JSON格式投递，和下载一样，batchPost也接受任务池管理。
    - jQuery 3.1.1 的所有方法

