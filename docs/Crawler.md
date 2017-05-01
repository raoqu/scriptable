# Scriptable Chrome扩展

## 爬虫框架

* extentionCrawl(`options`)

### 示例
```
var context = {};
extensionCrawl({
    onFork: function(data) {
        ...
    },
    onPageLoad: function(api, times) {
        if( times == 0 ) 
            return this.delay(50);
        api.remove(['#banner', '.advertisement']);
    },
    process: function() {
        let imageTasks = DownloadUtils.parseImageTasks('.className', 'folder');
        let imageTasks2 = DownloadUtils.parseImageTasks('.className2', 'folder');
        let linkTasks = DownloadUtils.parseLinkTasks('.className', 'folder');
        let tasks = DownloadUtils.mergeTasks(imageTasks, imageTasks2, linkTasks);

        api.download(
            tasks,
            function(task) {
                NetWorkUtils.post(
                    service: 'http://localhost/crawler_storage/appendix'
                    data: {
                        id: task.id,
                        url: task.url,
                        path: task.filename,
                        pageUrl: window.location.href,
                        removeDuplicated: true
                    }
                );
            },
            function(batchId) {
                NetworkUtils.post(
                    service: 'http://localhost/crawler_storage/article',
                    data: {
                        title: Html.text('#title'),
                        content: Html.html('.main_01'),
                        url: window.location.href
                    }
                );
            }
        }
        );
    },
    abort: function() {
    },
    complete: function() {
        Extension.getTabId(function(tabId){
            Extension.sendMessage(context.parentId, {
                ...
            });
        });
    },
});
```

options用法说明：

    - onPageLoad(api, times) 页面已加载
        在这个方法中实现页面状态的检测，如果页面上还存在正在动态加载的内容可以使用 api.delay 延迟检查;
        times表示当前步骤重复执行的次数，每次+1；
        如果页面已经加载完成可以使用 api.remove 移除页面上不需要的内容。
    － process(api, times) 正文处理


### API 

API提供以下方法：

    - delay 在回调执行结束以后延迟一段时间再重试调用当前方法，参数为毫秒数 
            return api.delay(10);

    - remove 从页面删除指定的元素，参数为CSS选择器数组，
            api.remove(['.className', '#id']);

    - download 从页面下载内容
            api.download(tasks, 'folder', fileCallback, batchCallback)
            - fileCallback(task) 每个文件下载完成回调一次 {id, url, filename}
            - batchCallback(batchId) 整批文件下载完成后回调

            下载未完成之前不会从 download 过程进入到下一个状态
            一般情况下每个爬虫页面尽可能只使用一次download/downloadImages方法

    - downloadImages 从页面下载图片（自动解析文档）
            api.downloadImages('.className', 'folder', fileCallback, batchCallback)

此外扩展本身也提供其他工具类：

    - DownloadUtils.parseImageTasks
    - DownloadUtils.parseLinkTasks
    - DownloadUtils.mergeTasks
            在使用api.download进行批量下载时使用Pool管理，当前设置单个页面并发下载数量为5；
    - NetworkUtils.post
            用于向服务端投递数据，其中数据会被转换为JSON格式投递
            NetworkUtiils.post( serviceUrl, dataObject, function(success, data) {})
    - jQuery 3.1.1 的所有方法

### 结构：


整体过程由`stage`方法分发，每次分发每个函数都会收到以下参数：

    - api api接口，设计初衷里api只有在必要的时候才由回调函数使用，一般情况下不需要显式调用
    - times 第几次进入该状态回调

爬虫的执行过程分为如下几个阶段：
```
    this.tasks = ['init', 'preprocess', 'process', 'waitDownload', 'store', 'complete'];
```
* init

    页面加载完成，但是有些页面的内容加载是在整个页面onload以后再由js触发去动态加载的，这个时候页面内容还没有准备就绪，一般这个时候通过`api.delay`来解决。

    该过程对应的options方法为 `onPageLoad`

* preprocess

    参数类型为`function`回调函数，提供一个方法检测页面内容是否就绪，如果回调函数返回`false`，那么表明页面还没有准备就绪，那么页面会等待`interval`设定的毫秒数以后再次执行check方法直到页面就绪。

* process

    执行爬虫执行前的预处理，如果`pre`方法返回false那么会终止爬虫过程，进入到`terminate`阶段，最后再进入`complete`阶段。

* waitDownload

    在此前阶段通过 `api.download` 方法执行的下载任务，在此阶段需要完成等待。
    所有内容下载完成后才进入下一阶段

* content



* complete

    触发 options 的 `complete` 回调。
