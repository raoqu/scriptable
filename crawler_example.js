extentionCrawl({
	excludes: ['.adv'],
	appendix: true,
	filterAppendix: function(url, base, absUrl, data) {
		if( url.match(/thumbnail/)) {
			return false;
		}
		
		if( url.match(/download/)) {
			data.url = url.replace('/\/download\//g', '\/download\/' + ScUniqId());
		}
	},
	preProcess: function(dt, api) {
		let data = {
			title: api.text('#title'),
			article: api.content('.body .page'),
			textOnly: api.contentWithoutAppendix('#content'),
			list: api.list('.list', '.item a')
		};
		return data;
	},
	process: function(data, ajax, complete, next) {
		ajax.post(data, function(result){
			complete();
		});
	}
});