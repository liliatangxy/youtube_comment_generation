var express = require('express')
var app = express()
var https = require('https')
var http = require('http')
var fs = require('fs')
var config = require('./config.json')


function positive(s) {

	if (s == undefined || s == "") return -1;

	var comment = JSON.stringify({
	"documents": [
		{
		"language": "en",
		"id": "0",
		"text": s
		}
	]
	})

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
	score = -999

	var makeRequest = function (options, callback) {
		var postReq = https.request(options, function(response) {
			var rawData = ""
			response.setEncoding('utf8')
			response.on('data', (chunk) => rawData += chunk)
			response.on('end', function() {
				callback(rawData)
			})
		})
		postReq.write(comment)
		postReq.end()
	}

	var callbackFinished = function () {
		data = JSON.parse(rawData)
		console.log(data)
		score = data['documents']['score']
	}

	makeRequest(options. callbackFinished)

	return score
}

function getComments(videoId) {
	var options = {
		"host": "www.googleapis.com",
		"path": "/youtube/v3/commentThreads",
		"method": "GET",
		"data": {
			"part": "id,replies,snippet",
			"videoId": videoId,
			"key": config.apiKey
		}
	}
	var commentList = []
	https.get("https://www.googleapis.com/youtube/v3/commentThreads?part=id,replies,snippet&videoId=VnT7pT6zCcA&key=AIzaSyBxs-6Se4npdSVpxprIHMcLBVmcy77OrvM", function (res) {
		var rawData = ""
		res.setEncoding('utf8')
		res.on('data', (chunk) => rawData += chunk)
		res.on('end', function() {
			var data = JSON.parse(rawData)
			for (key in data['items']) {
				var comment = {}
				var string = data['items'][key]['snippet']['topLevelComment']['snippet']['textDisplay']
				comment.text = string
				comment.sentiment = positive(string)
				comment.replies = []
				if (data['items'][key].hasOwnProperty('replies')) {
					for (key_replies in data['items'][key]['replies']['comments']) {
						var text_stuff = data['items'][key]['replies']['comments'][key_replies]['textDisplay']
						var sentiment_score = positive(text_stuff)
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

getComments("24RYgiLNZRU")
