var express     =     require('express');  
var bodyParser  =     require('body-parser');


// Twilio Credentials 
var accountSid = process.env.ACCOUNT_SID; 
var authToken = process.env.AUTH_TOKEN; 
var auth = process.env.AUTH;
var environment = process.env.ENV;
var phoneNumber = process.env.REPLY_NUMBER;

//require the Twilio module and create a REST client 
var twillio = require('twilio')(accountSid, authToken); 
var surveyResults = {};
var surveySetup = [];

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
      for (const x of surveySetup) {
        surveyOptions = surveyOptions + '"' + x.id + '" for ' + x.name + '\n'
      }
      let messageText = "Unknown vote has been cast, please text the following: \n" + surveyOptions
      if(surveyResults[request.body.From] === undefined) {
        for (const x of surveySetup) {
          if(x.name.toUpperCase() === request.body.Body.toUpperCase() || x.id.toUpperCase() === request.body.Body.toUpperCase()){
            messageText = "vote has been cast for " + x.name
            surveyResults[request.body.From] = x.id
          }
        }
      } else {
        for (const x of surveySetup) {
          if(x.name.toUpperCase() === request.body.Body.toUpperCase() || x.id.toUpperCase() === request.body.Body.toUpperCase()){
            messageText = "vote has been changed from " + surveySetup[surveyResults[request.body.From]].name + " to " + x.name
            surveyResults[request.body.From] = x.id
          }
        }
      }
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

  });

  app.get("/results", function(request, response) {
    if(request.headers.authorization !== auth) {
      response.status(401).send("Unauthorized");
    } else {
      let surveyOutput = [];
      for (const x of surveySetup) {
        let count = 0;
        for (y in surveyResults) {
          if(x.id === surveyResults[y]) {
            count++;
          }
        }
        surveyOutput.push({name: x.name, number: count, id: x.id});
      }

      response.status = 200;
      response.send(surveyOutput);
    }

  })

  app.post("/setup", function(request, response) {
    if(request.headers.authorization !== auth) {
      response.status(401).send("Unauthorized");
    } else {
      surveyResults = {};
      surveySetup = request.body;
      response.send("");
    }
  });