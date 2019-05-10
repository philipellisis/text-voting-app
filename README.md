# text-voting-app

Just a simple app that can integrate with an twilio to accept votes via text message and count them up.

# instuctions to use:

1. clone the app
2. insert your app name into the manifest.yml
3. insert your twilio account sid and auth token in the app.js file
4. open  the cloud foundry cli and 'cf push' the app into a pivotal cloud foundry instance
5. configure your webhooks in twilio for when a message comes in with the following:
    https://{app-name}.cfapps.io/text
6. send a request to the app with your configuration:
    POST: https://{app-name}.cfapps.io/setup
    BODY (example):
    {
      "1" : {
        "name" : "dog",
        "id" : "1"
      },
      "2" : {
        "name" : "horse",
        "id" : "2"
      }, 
      "3" : {
        "name" : "cat",
        "id" : "3"
      }
    }
    
7. to get the results:
    GET: https://{app-name}.cfapps.io/results
