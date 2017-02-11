var express = require('express')
var app = express()
var https = require('https')
var http = require('http')
var fs = require('fs')
var qs = require('qs')
var config = require('./config.json')
var request = require('sync-request')


function positive(s) {

	if (s == undefined || s == "") return -1;
	//return Math.random(0,1);

	var comment = {
	"documents": [
		{
		"language": "en",
		"id": "0",
		"text": s
		}
	]
	}

	var options = {
		"host": "westus.api.cognitive.microsoft.com",
		"port": 443,
		"path": "/text/analytics/v2.0/sentiment",
		"headers": {
			"Content-Type": "application/json",
			"Content-Length": Buffer.byteLength(comment),
			"Ocp-Apim-Subscription-Key": config.microsoftAPIKey
		},
		"method": "POST"
	}

	var request = require('sync-request')
	var res = request('POST', 'https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment', {
	  json: comment,
	  headers: {"Ocp-Apim-Subscription-Key": config.microsoftAPIKey}
	})
	data = JSON.parse(res.getBody('utf8'))
	score = data['documents'][0]['score']
	return score
}

function getComments(videoId) {
	var get_params = qs.stringify({
			"part": "id,replies,snippet",
			"videoId": videoId,
			"key": config.apiKey
			})

	var url = "https://www.googleapis.com/youtube/v3/commentThreads?".concat(get_params)

	var commentList = []
	var get_req = https.request(url, function (res) {
		var rawData = ""
		res.setEncoding('utf8')
		res.on('data', (chunk) => rawData += chunk)
		res.on('end', function() {
			var data = JSON.parse(rawData)
			for (key in data['items']) {
				if (key > 150) break;
				var comment = {}
				var string = data['items'][key]['snippet']['topLevelComment']['snippet']['textDisplay']
				comment.text = string
				comment.sentiment = positive(string)
				if (comment.sentiment == -1) continue; // error from MS api
				comment.replies = []
				if (data['items'][key].hasOwnProperty('replies')) {
					for (key_replies in data['items'][key]['replies']['comments']) {
						var text_stuff = data['items'][key]['replies']['comments'][key_replies]['textDisplay']
						var sentiment_score = positive(text_stuff)
						if (sentiment_score == -1) continue; // error from MS api
						comment.replies.push([
							{
								'text': text_stuff,
								'sentiment': sentiment_score
							}
						])
					}
				}
				commentList.push(comment)
			}
			var str = JSON.stringify(commentList)
			fs.writeFile("comments.json", str, function(err) {
				if (err) {
					console.log("error writing file ", err)
				}
			})
		})
	})
	get_req.write(get_params)
	get_req.end()
}

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/force_directed.html')
});

app.get('/force_directed.html', function (req, res) {
	res.sendFile(__dirname + '/force_directed.html')
});

app.get('/comments.json', function (req, res) {
	res.sendFile(__dirname + '/comments.json')
});


app.listen(8000, function() {
	console.log('Listening on port 8000')
});

getComments("oHTzsteQx3g")
