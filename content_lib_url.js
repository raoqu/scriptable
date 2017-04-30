
class UrlUtils {

	// parse url of a relative url from current page
	// e.g.
	//  var url = UrlUtils.resolve('../../css/index.css');
	static resolve(url) {
		return UrlUtils.resolveUrl(url, window.location.href);
	}

	// translate relative url into absolute url
	//  url: relative url
	//  base: page url base of the relative url
	static resolveUrl(url, base){
		if('string'!==typeof url || !url){
			return null; // wrong or empty url
		}
		else if(url.match(/^[a-z]+\:\/\//i)){ 
			return url; // url is absolute already 
		}
		else if(url.match(/^\/\//)){ 
			return 'http:'+url; // url is absolute already 
		}
		else if(url.match(/^[a-z]+\:/i)){ 
			return url; // data URI, mailto:, tel:, etc.
		}
		else if('string'!==typeof base){
			var a=document.createElement('a'); 
			a.href=url; // try to resolve url without base  
			if(!a.hostname || !a.protocol || !a.pathname){ 
					return null; // url not valid 
			}
			return 'http://'+url;
		}
		else{ 
			base = UrlUtils.resolveUrl(base); // check base
			if(base===null){
				return null; // wrong base
			}
		}

		return UrlUtils.compose(base, url);
	}

	// Compose relative url passby creating <a> tag
	static compose(base, url) {
		var a=document.createElement('a'); 
		a.href=base;

		if(url[0]==='/'){ 
			base=[]; // rooted path
		}
		else{ 
			base=a.pathname.split('/'); // relative path
			base.pop(); 
		}
		url=url.split('/');
		for(var i=0; i<url.length; ++i){
			if(url[i]==='.'){ // current directory
					continue;
			}
			if(url[i]==='..'){ // parent directory
				if('undefined'===typeof base.pop() || base.length===0){ 
						return null; // wrong url accessing non-existing parent directories
				}
			}
			else{ // child directory
				base.push(url[i]); 
			}
		}
		return a.protocol+'//'+a.hostname+base.join('/');
	}

	static resolveFilePath(absoluteUrl, folder) {
		var a=document.createElement('a'); 
		a.href=absoluteUrl; // try to resolve url without base 
		var path = a.pathname;
		if( path ) {
			var stack = path.split('/');
			if( stack ) {
				stack.length && !stack[0] && stack.shift(); // remove first empty string
				! stack.length && stack.push(BaseUtils.uniqId());
				folder && stack.unshift(folder);
				stack.length && !stack[stack.length-1] && (stack[stack.length-1] = BaseUtils.uniqId()); // filename should not be empty
				path = stack.join('/');
			}
		}
		//path = path.replace(/benryanconversion/, 'benryanconversion.1')
		return path;
	}
}