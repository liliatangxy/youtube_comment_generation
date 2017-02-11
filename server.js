var express = require('express')
var app = express()
var https = require('https')
var http = require('http')
var fs = require('fs')

var config = require('./config.json')

function positive(s) {
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
		"path": "/text/analytics/v2.0/sentiment",
		"headers": {
			"Content-Type": "application/json",
			"Ocp-Apim-Subscription-Key": config.microsoftAPIKey
		},
		"method": "POST",
		"data": comment
	}
	http.request(options, function (res) {
		https.get(url, function(response) {
			response.on('data', function(chunk) {
				data = JSON.parse(chunk)
				return data['documents']['score']
			})
		})
	})
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
				string = data['items'][key]['snippet']['topLevelComment']['snippet']['textDisplay']
				comment.text = string
				comment.replies = []
				if (data['items'][key].hasOwnProperty('replies')) {
					for (key_replies in data['items'][key]['replies']['comments']) {
						comment.replies.push([
							{
								'text': data['items'][key]['replies']['comments'][key_replies]['textDisplay']
							}
						])
					}
				}
				commentList.push(comment)
			}
			for (comment in commentList) {
				comment.sentiment = positive(comment.text)
				for (reply in comment.replies) {
					reply.sentiment = positive(reply.text)
				}
			}
			console.log(commentList)
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

app.listen(8000, function() {
	console.log('Listening on port 8000')
});

getComments("24RYgiLNZRU")
