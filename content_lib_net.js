class AjaxUtils {
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

  static batchPost(postTasks, callback, batchCallabck) {
  	AJAX_POOLED_MANAGER.addBatch(BaseUtils.uniqId(), postTasks, callback, batchCallabck);
  }
}

class PooledAjaxManager extends PooledTaskManager {
	constructor(limit) {
		super(limit);
	}

	process(taskId, task, resolve) {
		AjaxUtils.post(task.url, task.data, 
			function(success, data) {
				resolve({success: success, data: data, id: task.id, task: task});
			}
		);
	}
}

var AJAX_POOLED_MANAGER = new PooledAjaxManager(3);

