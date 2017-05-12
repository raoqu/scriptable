(function(){
	let postTasks = [];
	let storing = false;

	extentionCrawl({
		init: function(api, times, tabData, parentData, parentTabId) {
			api.downloadImages( '.Card', 'zhihu',
				function(task, result) { 
					console.log('download:' + task.id); 
					if( result.success ) {
						postTasks.push({
							id: BaseUtils.uniqId(),
							url: 'http://localhost/storage/appendix',
							data: {
								url: task.url,
								filename: result.localfile
							}
						})
					}
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

					storing = true;
					// post data
AjaxUtils.batchPost(postTasks,
	function(task, result) { 
		console.log('post complete: ' + task.id); 
	},
	function(batchId) { 
		storing = false;
		console.log('batch complete: ' + batchId) 
	}
);
				} 
			); 
		},

		store: function(api, times) {
			if( storing) {
				return api.delay(100);
			}
			console.log('END OF STORE');
		},

		complete: function() {
			console.log('END OF CRAWLING');
		}
	});
})();