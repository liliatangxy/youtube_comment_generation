var express = require('express')
var app = express()
var http = require('http')

var configFile = require('./config.js')

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
		"url": "https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment",
		"headers": {
			"Content-Type": "application/json",
			"Ocp-Apim-Subscription-Key": config.microsoftAPIKey
		},
		"data": comment
	}
	http.post(options, function (res) {
		http.get(url, function(response) {
			response.on('data', function(chunk) {
				data = JSON.parse(chunk)
				return data['documents']['score']
			})
		})
	})
}

function getComments(activityId) {
	http.get("https://www.googleapis.com/plus/v1/activities/" + activityId + "/comments", function (res) {
		res.on('data', function(chunk) {
			var data = JSON.parse(chunk)
			var commentList = []
			for (key in data['items']) {
				var comment = []
				string = key['snippet']['topLevelComment']['textDisplay']
				comment.text = string
				comment.replies = []
				if (positivity(string)) commentList.push(string)
				for (key_replies in key['replies']['comments']) {
					comment.replies.append([
						{
						'text': key_replies['textDisplay']
						}
					])
				}
			}
			commentList.append(comment)
		})
	})
	for (comment in commentList) {
		comment.sentiment = positivity(comment.text)
		for (reply in comment.replies) {
			reply.sentiment = positivity(reply.text)
		}
	}
	return commentList
}

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/graph.html')
});

app.listen(8000, function() {
	console.log('Listening on port 8000')
});
