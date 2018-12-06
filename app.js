var express = require('express');//引入模块
var cheerio = require('cheerio');
var charset = require('superagent-charset');//解决乱码问题
var superagent = require('superagent');
charset(superagent);
var eventproxy = require('eventproxy');
var ep = eventproxy();
var async = require('async');
var app = express();
var baseUrl = 'http://www.dytt8.net';//迅雷首页链接
var newMovieLinkArr = [];//存放新电影的url
var concurrencyCount = 0;
var num = 0;
app.get('/', function (req, res, next) {
	// superagent
	// 	.get('http://news.baidu.com/')//请求页面地址
	// 	.charset('utf-8')
	// 	.end(function (err, sres) {//页面获取到的数据
	// 		if (err) return next(err);
	// 		var $ = cheerio.load(sres.text);//用cheerio解析页面数据
	// 		var arr = [];
	// 		$("#pane-news>ul").each(function (index, element) {//下面类似于jquery的操作，前端的小伙伴们肯定很熟悉啦
	// 			console.log(index);
	// 			var $eleItem = $(element).find('.bold-item a');
	// 			var $eleItemSon = $(element).find('.bold-item ~ li a')
	// 			arr.push(
	// 				{
	// 					title: $eleItem.text(),
	// 					href: $eleItem.attr('href')
	// 					// item: {
	// 					// 	title: $eleItemSon.text(),
	// 					// 	href: $eleItemSon.attr('href')
	// 					// }
	// 				}
	// 			);
	// 		});
	// 		res.write('<head><meta charset="utf-8"/></head>');
	// 		arr.forEach((element,index) => {
	// 			res.write('<br/>');
	// 			res.write((index+1)+'、新闻-->' +element.title);
	// 			res.write('<br/>');
	// 			res.write('详情链接-->  <a href=' + element.href + ' target="_blank">' + element.href + '<a/>');
	// 			res.write('<br/>');
	// 			res.write('<br/>');
	// 		});
	// 		//res.send(arr);
	// 	})
	(function (page) {
		superagent
			.get(page)
			.charset('gb2312')
			.end(function (err, sres) {
				if (err) return next(err);
				var $ = cheerio.load(sres.text);
				var linkElem = $('.co_content2 ul a');
				// console.log(linkElem);
				for (var i = 2; i < linkElem.length; i++) {
					var url = 'http://www.dytt8.net' + linkElem.eq(i).attr('href');
					//去重
					if (newMovieLinkArr.indexOf(url) == -1) {
						newMovieLinkArr.push(url);
					}
				}
				console.log(newMovieLinkArr);
				ep.emit('get_topic_html', 'get' + page + ' successful');
			})
	}(baseUrl));
	ep.after('get_topic_html', 1, function (eps) {
		// 控制最大并发数为5，在结果中取出callback返回来的整个结果数组。
		// mapLimit(arr, limit, iterator, [callback])
		async.mapLimit(newMovieLinkArr, 5, function (myurl, callback) {
			//console.log(myurl);
			fetchUrl(myurl, callback);
		}, function (err, result) {
			// 爬虫结束后的回调，可以做一些统计结果
			console.log('抓包结束，一共抓取了-->' + newMovieLinkArr.length + '条数据');
			return false;
		})
	})
	function fetchUrl(myurl, callback) {
		var fetchStart = new Date().getTime();
		concurrencyCount++;
		console.log('现在的并发数是', concurrencyCount, ',正在抓取的是', myurl);
		superagent
			.get(myurl)
			.charset('gb2312')
			.end(function (err, sres) {
				if (err) return next(err);
				var time = new Date().getTime() - fetchStart;
				console.log('抓取 ' + myurl + ' 成功', '，耗时' + time + '毫秒');
				concurrencyCount--;
				num += 1;
				var $ = cheerio.load(sres.text);
				res.write('<head><meta charset="utf-8"/></head>');
				getDownloadLink($, function (obj) {
					res.write('<br/>');
					res.write(num + '、电影名称-->  ' + obj.movieName);
					res.write('<br/>');
					res.write('迅雷下载链接-->  ' + obj.downLink);
					res.write('<br/>');
					res.write('详情链接-->  <a href=' + myurl + ' target="_blank">' + myurl + '<a/>');
					res.write('<br/>');
					res.write('<br/>');
				})
				var result = {
					movieLink: myurl
				};
				callback(null, result);
			})
	}
});
function getDownloadLink($, callback) {
	var downLink = $('#Zoom table a').text();
	var movieName = $('.title_all h1 font').text();
	var obj = {
		'downLink': downLink,
		'movieName': movieName
	}
	if (!downLink) {
		downLink = '该电影暂无链接';
	}
	callback(obj);
}
module.exports = app;