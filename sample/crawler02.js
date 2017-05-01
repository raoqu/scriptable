(function(){
	extentionCrawl({
		onPageLoad: function(api, times) { 
			if( times < 3 )
				return api.delay(1000);
		}, 
		process: function(api, times) { 
			let imageTasks = DownloadUtils.parseImageTasks('body', 'localhost');
			DownloadUtils.batchDownload( BaseUtils.uniqId(), imageTasks,
				function(task) { 
					console.log('download:' + task.id); 
				}, 
				function(batchId) { 
					console.log('BATCH:' + batchId); 
				} 
			); 
		}
	});
})();