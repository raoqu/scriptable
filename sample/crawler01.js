(function(){
	let postTasks = [];

	extentionCrawl({
		onPageLoad: function(api, times) { }, 

		process: function(api, times) {    
			api.downloadImages( '.Card', 'zhihu',
				function(task) { 
					console.log('download:' + task.id); 
					postTasks.push({
						id: BaseUtils.uniqId(),
						url: 'http://localhost/storage/appendix',
						data: {
							url: task.url,
							filename: task.filename
						}
					})
				}, 
				function(batchId) { 
					console.log('BATCH:' + batchId); 
					postTasks.push({
						id: BaseUtils.uniqId(),
						url: 'http://localhost/storage/article',
						data: {
							url: window.location.href,
							title: $('.QuestionHeader-title').text(),
							content: $('.QuestionAnswer-content').html()
						}
					});
					// post data
					AjaxUtils.batchPost(postTasks,
						function(task) { console.log('post complete: ' + task.id); },
						function(batchId) { console.log('batch complete: ' + batchId) }
					);
				} 
			); 
		}
	});
})();