var express = require('express'),
	io = require('socket.io'),
	twitter = require('ntwitter'),
	http = require('http'),
	cronJob = require('cron').CronJob,
    _ = require('underscore'),
    path = require('path'),
    config = require('./config');

var app = express();

var server = http.createServer(app);


var watchSymbols = ['node', 'dart', 'ruby', 'kayne'];


var watchList = {
	total: 0,
	symbols: {}
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

//Instantiate the twitter component
//You will need to get your own key. Don't worry, it's free. But I cannot provide you one
//since it will instantiate a connection on my behalf and will drop all other streaming connections.
//Check out: https://dev.twitter.com/
var twit = new twitter({
    consumer_key: config.twitter.consumer_key,           
    consumer_secret: config.twitter.consumer_secret,        
    access_token_key: config.twitter.access_token_key,     
    access_token_secret: config.twitter.access_token_secret    
});

twit.stream('statuses/filter', {track:watchSymbols},function(stream){
	stream.on('data',function(tweet){

		var claimed = false;

		if(tweet.text === undefined){
			return;
		}

		var text = tweet.text.toLowerCase();

		_.each(watchSymbols, function(value){
		
			if(text.indexOf(value.toLowerCase()) !== -1){
				watchList.symbols[value]++;
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