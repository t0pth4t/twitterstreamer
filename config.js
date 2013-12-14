var config = {}

config.twitter = {};

    config.twitter.consumer_key= process.env.CONSUMER_KEY;
    config.twitter.consumer_secret= process.env.CONSUMER_SECRET;        
    config.twitter.access_token_key= process.env.ACCESS_TOKEN_KEY;       
    config.twitter.access_token_secret= process.env.ACCESS_TOKEN_SECRET;

module.exports = config;