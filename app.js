var express       =     require('express');  
var bodyParser    =     require('body-parser');
var redis         =     require('redis');
const {promisify} =     require('util');


// Twilio Credentials 
var accountSid = process.env.ACCOUNT_SID; 
var authToken = process.env.AUTH_TOKEN; 
var auth = process.env.AUTH;
var environment = process.env.ENV;
var phoneNumber = process.env.REPLY_NUMBER;

//redis credentials and connection plus setup
var vcap_services = process.env.VCAP_SERVICES;
var rediscloud_service = JSON.parse(vcap_services)["rediscloud"][0]
var credentials = rediscloud_service.credentials;
var redisClient = redis.createClient(credentials.port, credentials.hostname, {no_ready_check: true});
redisClient.auth(credentials.password);
redisClient.on('connect', function() {
  console.log('connected to redis');
});
const getAsync = promisify(redisClient.get).bind(redisClient);

//require the Twilio module and create a REST client 
var twillio = require('twilio')(accountSid, authToken); 



//check environment and initialize variables appropriately
console.log('******************survey counter started on ' + environment + ' ******************');



//start server and listen on predix port, or local port defined in settings
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 
var server = app.listen(process.env.PORT || 5000, function () {
  console.log('Server started on port: ' + server.address().port);
});


app.post("/text", function (request, response) {
    console.log(request.body);
    if(request.body.AccountSid !== accountSid) {
      response.status(401).send("Unauthorized");
    } else {
      let surveyOptions = "";
      redisClient.get('surveySetup', (err, value) => {
        let surveySetup = JSON.parse(value);
        if(err === null) {
          for (const x of surveySetup) {
            surveyOptions = surveyOptions + '"' + x.id + '" for ' + x.name + '\n'
          }
          let messageText = "Unknown vote has been cast, please text the following: \n" + surveyOptions
          redisClient.hexists("votes", request.body.From, (err, reply) =>{
            if(reply === 0) {
              for (const x of surveySetup) {
                if(x.name.toUpperCase() === request.body.Body.toUpperCase() || x.id.toUpperCase() === request.body.Body.toUpperCase()){
                  messageText = "vote has been cast for " + x.name;
                  redisClient.hset("votes", request.body.From, x.id);
                  redisClient.incr(x.id);
                }
              }
              sendSMSreply(request, response, messageText);
            } else {
              redisClient.hget("votes", request.body.From, (err, reply) => {
                for (const x of surveySetup) {
                  if(x.name.toUpperCase() === request.body.Body.toUpperCase() || x.id.toUpperCase() === request.body.Body.toUpperCase()){
                    messageText = "vote has been changed from " + getSurveyNameFromID(surveySetup, reply) + " to " + x.name;
                    redisClient.hset("votes", request.body.From, x.id);
                    redisClient.incr(x.id);
                    redisClient.decr(reply);
                  }
                }
                sendSMSreply(request, response, messageText);
              })
            }
          })


        } else {
          response.status(500).send("Error fetching survey data");
        }
      });
    }

  });

  function getSurveyNameFromID(surveySetup, id) {
    for (const x of surveySetup) {
      if(x.id === id){
        return x.name;
      }
    }
  }

  function sendSMSreply(request, response, messageText) {
    if(environment === 'production') {
      console.log('sending message: ' + messageText + ' to twillio');
      twillio.messages.create({ 
        to: request.body.From, 
        from: phoneNumber, 
        body: messageText, 
      }).then(message => console.log(message));;
    } else {
      console.log('not sending message to twillio because environment is ' + environment);
    }
    response.send(messageText);
  }

  app.get("/results", function(request, response) {
    if(request.headers.authorization !== auth) {
      response.status(401).send("Unauthorized");
    } else {
      redisClient.get('surveySetup', (err, value) => {
        if(err === null) {
          getResults(response, JSON.parse(value));
        } else {
          response.status(500).send("Error fetching survey data");
        }
      });

    }

  })

  async function getResults(response, surveySetup) {
    let surveyOutput = [];
    for (const x of surveySetup) {
      const count = await getAsync(x.id);
      if(count === null) {
        surveyOutput.push({name: x.name, number: 0, id: x.id});
      } else {
        surveyOutput.push({name: x.name, number: count, id: x.id});
      }
    }
    response.send(surveyOutput);
  }

  app.post("/setup", function(request, response) {
    if(request.headers.authorization !== auth) {
      response.status(401).send("Unauthorized");
    } else {

      redisClient.get('surveySetup', (err, value) => {
        if(err === null) {
          if(value !== null) {
            let surveySetup = JSON.parse(value);
            for (const x of surveySetup) {
              redisClient.del(x.id);
            }
          }
        } else {
          response.status(500).send("Error fetching survey data");
        }
      });
      redisClient.del('votes');
      redisClient.set('surveySetup', JSON.stringify(request.body),(err, reply) =>{
        if(err === null) {
          response.send("");
        } else {
          response.status(500).send("Error setting survey data");
        }
      }) 
    }
  });