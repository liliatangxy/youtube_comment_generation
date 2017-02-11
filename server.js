var express = require('express')
var app = express()
var https = require('https')
var http = require('http')
var fs = require('fs')
var qs = require('qs')
var config = require('./config.json')
var request = require('sync-request')
const Markov = require('libmarkov')
var unescape = require('unescape')
var bodyParser = require('body-parser');

function generateMarkov(comments_json_path) {
	var comments_json = JSON.parse(fs.readFileSync(comments_json_path, 'utf8'))

	var text = ""

	for (var i = 0; i < comments_json.length; i++) {
		text += comments_json[i].text + " "
	}

	var generator = new Markov(text);
 
	var logger = fs.createWriteStream('markov.txt', {
	  flags: 'w'
	})

	for (var i = 0; i < 500; i++) {
		logger.write(generator.generate(1))
		logger.write("\n")
	}
	logger.end()
}

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
				if (key > 250) break;
				var comment = {}
				var string = data['items'][key]['snippet']['topLevelComment']['snippet']['textDisplay']
				comment.text = unescape(string)
				comment.sentiment = positive(string)
				if (comment.sentiment == -1) continue; // error from MS api
				comment.replies = []
				if (data['items'][key].hasOwnProperty('replies')) {
					for (key_replies in data['items'][key]['replies']['comments']) {
						var text_stuff = unescape(data['items'][key]['replies']['comments'][key_replies]['textDisplay'])
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


app.use(bodyParser.urlencoded());
app.use(bodyParser.json());


app.use(express.static(__dirname));
app.use(express.static("public"));


app.get('/', function (req, res) {
	res.sendFile(__dirname + '/force_directed.html')
});

app.get('/force_directed.html', function (req, res) {
	res.sendFile(__dirname + '/force_directed.html')
});

app.get('/comments.json', function (req, res) {
	res.sendFile(__dirname + '/comments.json')
});

app.post('/parsevideo', function (req, res) {
	getComments(req.body.videoId)
	generateMarkov("comments.json")
	res.sendFile(__dirname + '/parsevideo.html')
});


app.listen(8000, function() {
	console.log('Listening on port 8000')
});