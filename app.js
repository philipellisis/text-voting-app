var express     =     require('express');  
var bodyParser  =     require('body-parser');


// Twilio Credentials 
var accountSid = ''; 
var authToken = ''; 

//require the Twilio module and create a REST client 
var twillio = require('twilio')(accountSid, authToken); 
var surveyResults = {};
var surveySetup = {};

//check environment and initialize variables appropriately
console.log('******************survey counter started******************');



//start server and listen on predix port, or local port defined in settings
var app    = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 
var server = app.listen(process.env.PORT || 5000, function () {
  console.log('Server started on port: ' + server.address().port);
});


app.post("/text", function (request, response) {
    console.log(request.body);
    let surveyOptions = "";
    for (x in surveySetup) {
      surveyOptions = surveyOptions + '"' + surveySetup[x].id + '" for ' + surveySetup[x].name + '\n'
    }
    let messageText = "Unknown vote has been cast, please text the following: \n" + surveyOptions
    if(surveyResults[request.body.From] === undefined) {
      for (x in surveySetup) {
        if(surveySetup[x].name.toUpperCase() === request.body.Body.toUpperCase() || surveySetup[x].id.toUpperCase() === request.body.Body.toUpperCase()){
          messageText = "vote has been cast for " + surveySetup[x].name
          surveyResults[request.body.From] = x
        }
      }
    } else {
      for (x in surveySetup) {
        if(surveySetup[x].name.toUpperCase() === request.body.Body.toUpperCase() || surveySetup[x].id.toUpperCase() === request.body.Body.toUpperCase()){
          messageText = "vote has been changed from " + surveySetup[surveyResults[request.body.From]].name + " to " + surveySetup[x].name
          surveyResults[request.body.From] = x
        }
      }
    }

    twillio.messages.create({ 
      to: request.body.From, 
      from: "+12162085774", 
      body: messageText, 
    }).then(message => console.log(message));;

    response.status = 200;
    response.send(messageText);
  });

  app.get("/results", function(request, response) {
    response.status = 200;
    response.send(surveyResults);
  })

  app.post("/setup", function(request, response) {
    surveyResults = {};
    surveySetup = request.body;
    response.status = 200;
    response.send("");
  });