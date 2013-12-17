var express = require('express'),
	io = require('socket.io'),
	twitter = require('ntwitter'),
	http = require('http'),
	cronJob = require('cron').CronJob,
    _ = require('underscore'),
    path = require('path'),
    moment = require('moment'),
    config = require('./config');

var app = express();

var server = http.createServer(app);


var watchSymbols = ['node.js','angular.js','gruntjs','grunt.js','meteor.js','meteorjs','firebase','angular','socketio','nodejs','bower', 'socket.io', 'angularfire', 'ember.js','emberjs','sailjs', 'backbone.js','expressjs', 'express.js', 'sail.js','asm.js'];


var watchList = {
	total: 0,
	symbols: {},
	recentTweet: "",
	lastUpdated: ""
};

_.each(watchSymbols, function(value){
	watchList.symbols[value] = 0;
});


app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

//We're using bower components so add it to the path to make things easier
app.use('/components', express.static(path.join(__dirname, 'components')));

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/',function(req,res){
	res.render('index',{data:watchList});
});

var sockets = io.listen(server);

sockets.configure(function() {
  sockets.set('transports', ['xhr-polling']);
  sockets.set('polling duration', 10);
});

sockets.sockets.on('connection',function(socket){
	socket.emit('data',watchList);
});

var twit = new twitter({
    consumer_key: config.twitter.consumer_key,           
    consumer_secret: config.twitter.consumer_secret,        
    access_token_key: config.twitter.access_token_key,     
    access_token_secret: config.twitter.access_token_secret    
});

twit.stream('statuses/filter', {track:watchSymbols},function(stream){
	stream.on('data',function(tweet){
		watchList.lastUpdated = moment().format('MMMM Do YYYY, h:mm:ss a');
		var claimed = false;

		if(tweet.text === undefined){
			return;
		}

		var text = tweet.text.toLowerCase();

		_.each(watchSymbols, function(value){
		
			if(text.indexOf(value.toLowerCase()) !== -1){
				watchList.symbols[value]++;
				if(tweet.lang === 'en')
					watchList.recentTweet = tweet.user.screen_name + ": " + tweet.text;
				claimed = true;
			}
		
		});

		if(claimed){
			watchList.total++;

			sockets.sockets.emit('data',watchList);
		}
	});
});

//Reset everything on a new day!
//We don't want to keep data around from the previous day so reset everything.
new cronJob('0 0 0 * * *', function(){
    //Reset the total
    watchList.total = 0;

    //Clear out everything in the map
    _.each(watchSymbols, function(value) { watchList.symbols[value] = 0; });

    //Send the update to the clients
    sockets.sockets.emit('data', watchList);
}, null, true);

//Create the server
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});