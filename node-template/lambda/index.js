const Alexa   = require("ask-sdk-core");
const AWS     = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');

function https_callback(ss, cr, im) {
  Object.entries(cr.getHeaders()).forEach(([k,v]) => {
    ss.addAnnotation(`https.ClientRequest.header.${k.replace(/-/g, '_')}`, v);
  });

  Object.entries(im.headers).forEach(([k,v]) => {
    ss.addAnnotation(`https.IncomingMessage.header.${k.replace(/-/g, '_')}`, v);
  });
}
const https   = AWSXRay.captureHTTPs(require('https'), false, https_callback);
//AWSXRay.captureAWS(require('aws-sdk'));  # Lots of overhead if you do this.
AWSXRay.enableManualMode();

var ddb;

var segment;

const actions = require("./functions");

const user_origin = process.env.USER_ORIGIN
const Bookmarks = JSON.parse(process.env.BOOKMARKS || {});
var user_destination = "XXXXXX"; // keep it as XXXXXX as it will be replaced later
const google_api_key = process.env.GOOGLE_API_KEY;

const google_api_traffic_model = "best_guess"; // it can be optimistic & pessimistic too
const google_api_departure_time = "now"; // now will mean the current time

const google_api_host = "maps.googleapis.com";
var google_api_path = "/maps/api/directions/json?origin=" +
  user_origin +
  "&destination=" +
  user_destination +
  "&key=" +
  google_api_key +
  "&traffic_model=" +
  google_api_traffic_model +
  "&departure_time=" +
  google_api_departure_time;

const Quotes = {
  Lincoln: [
    "Government of the people, by the people, for the people, shall not perish from the Earth.",
    "Nearly all men can stand adversity, but if you want to test a man's character, give him power.",
    "Whatever you are, be a good one."
  ],
  Einstein: [
    "Imagination is more important than knowledge.",
    "If the facts don't fit the theory, change the facts.",
    "Life is like riding a bicycle. To keep your balance you must keep moving."
  ]
};

// The "LaunchRequest" intent handler - called when the skill is launched
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "LaunchRequest";
  },
  handle(handlerInput) {
    const ss = segment.addNewSubsegment('LaunchRequestHandler');
    ss.addMetadata('requestEnvelope', JSON.stringify(handlerInput.requestEnvelope));
    ss.addAnnotation('requestType', Alexa.getRequestType(handlerInput.requestEnvelope) );

    const speechText = `Hi I am ${process.env.SKILL_NAME}, your cloud based personal assistant.`;
    const repromptText = "Sorry, I didn't catch that.  Do you need help?";

    ss.addMetadata('quote', speechText);

    handlerInput.attributesManager.setSessionAttributes({ type: "help"});

    // Speak out the speechText via Alexa
    const handlerResponse = handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();

    ss.close();
    return handlerResponse;
  }
};

const AuthorQuote = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === "IntentRequest" && (
        request.intent.name === "AuthorQuote" ||
        request.intent.name === "RandomQuote"
      )
    );
  },
  handle(handlerInput) {
    const ss = segment.addNewSubsegment('AuthorQuote');
    ss.addMetadata('requestEnvelope', JSON.stringify(handlerInput.requestEnvelope));
    ss.addMetadata('handlerInput', JSON.stringify(handlerInput));
    ss.addAnnotation('requestType', Alexa.getRequestType(handlerInput.requestEnvelope) );

    const request = handlerInput.requestEnvelope.request;
    ss.addAnnotation('intent', request.intent.name);

    const authorCandidate = request.intent?.slots?.author?.value;
    if(authorCandidate !== undefined) { ss.addAnnotation('authorCandidate', authorCandidate); }

    const [responseAuthor, quote] = actions.getQuote(Quotes, authorCandidate)
    if (!responseAuthor) {
      ss.addError(`unable to look up quotes for author ${authorCandidate}`);
//      ss.addErrorFlag();
      ss.close();
      return UnhandledHandler.handle(handlerInput, `invalid author ${authorCandidate}`);
    }

    const speechText = `${responseAuthor} said ${quote}`;
    ss.addAnnotation('responseAuthor', responseAuthor);

    const cardTitle = `Quotation from ${responseAuthor}`;
    const cardContent = quote;

    ss.addMetadata('quote', quote);

    // Speak out the speechText via Alexa
    const handlerResponse = handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard(cardTitle, cardContent)
      .withShouldEndSession(true)
      .getResponse();

    ss.close();
    return handlerResponse;
  }
};

const GetBookmarks = {
  canHandle(handlerInput) {
    return (
        handlerInput.requestEnvelope.request.type === "IntentRequest" &&
        handlerInput.requestEnvelope.request.intent.name === "GetBookmarks"
        );
  },
  handle(handlerInput) {
    const ss = segment.addNewSubsegment('GetBookmarks');
    ss.addMetadata('requestEnvelope', JSON.stringify(handlerInput.requestEnvelope));
    ss.addMetadata('handlerInput', JSON.stringify(handlerInput));
    ss.addAnnotation('requestType', Alexa.getRequestType(handlerInput.requestEnvelope) );

    const request = handlerInput.requestEnvelope.request;
    ss.addAnnotation('intent', request.intent.name);

    const keys = Object.keys(Bookmarks)
    const destinations = keys.length > 1
      ? keys.slice(0, -1).join(", ") + ", and " + keys.slice(-1)
      : keys[0];

    const speechText = `Your bookmarked places are ${destinations}`;
    ss.addMetadata('speechText', speechText);

    const handlerResponse = handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard("My Bookmarked Locations", destinations)
      .withShouldEndSession(true)
      .getResponse();

    ss.close();
    return handlerResponse;
  }
};

const HelpIntent = {
  canHandle(handlerInput) {
    return (
        handlerInput.requestEnvelope.request.type === "IntentRequest" &&
        handlerInput.requestEnvelope.request.intent.name === "AMAZON.HelpIntent"
        );
  },
  handle(handlerInput) {
    const ss = segment.addNewSubsegment('HelpIntent');
    ss.addMetadata('requestEnvelope', JSON.stringify(handlerInput.requestEnvelope));
    ss.addMetadata('handlerInput', JSON.stringify(handlerInput));
    ss.addAnnotation('requestType', Alexa.getRequestType(handlerInput.requestEnvelope) );

    const request = handlerInput.requestEnvelope.request;
    ss.addAnnotation('intent', request.intent.name);

    const attributes = { type: "bookmarks" };
    handlerInput.attributesManager.setSessionAttributes(attributes);

    let speechText = "I have the ability to read out quotes and get route information. To read out quotes, you can try saying, ask Eva for a random quote, or ask Eva for a quote from Einstein. To get route information you can try saying, ask Eva, how much time will it take you to reach office? I also have a few places bookmarked for easy access. Do you want me to read them out to you?";

    let repromptText = "Sorry, I did not receive any input. Do you want me to read out your bookmarked destinations?";

    const handlerResponse = handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();

    ss.close();
    return handlerResponse;
  }
};

// If the user said "Yes" to anything
const YesIntent = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.YesIntent"
      );
  },
  handle(handlerInput) {
    console.log("AMAZON.YesIntent intent handler called");

    let attributes = handlerInput.attributesManager.getSessionAttributes();
    let speechText = "";

    if (attributes.type) {
      switch (attributes.type) {
        case "bookmarks":
          return GetBookmarks.handle(handlerInput);
        case "help":
          return HelpIntent.handle(handlerInput);

        default:
          speechText = "Sorry, I do not understand how to process that.";
      }

    } else {
      speechText = "Sorry, I am not sure what you are saying Yes for.";
    }

    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  }
};

// When the user says "No" to a request
const NoIntent = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.NoIntent"
      );
  },
  handle(handlerInput) {
    console.log("NoIntent intent handler called");
    return handlerInput.responseBuilder
      .getResponse();
  }
};

// Gracefully handle any intent that wasn't handled
const Fallback = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.FallbackIntent"
      );
  },
  handle(handlerInput) {
    console.log("FallbackIntent Handler called");

    let speechText = "Sorry, I wasn't able to understand what you said. Thank you and good bye.";

    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  }
};

const TableName = {
  canHandle(handlerInput) {
    return (
        handlerInput.requestEnvelope.request.type === "IntentRequest" &&
        handlerInput.requestEnvelope.request.intent.name === "TableName"
        );
  },
  handle(handlerInput) {
    const ss = segment.addNewSubsegment('TableName');
    ss.addMetadata('requestEnvelope', JSON.stringify(handlerInput.requestEnvelope));
    ss.addMetadata('handlerInput', JSON.stringify(handlerInput));
    ss.addAnnotation('requestType', Alexa.getRequestType(handlerInput.requestEnvelope) );

    const sReq = handlerInput.requestEnvelope.request;
    ss.addAnnotation('intent', sReq.intent.name);

    const tableName = process.env.DDB_TABLE_NAME
    const pk = handlerInput.requestEnvelope?.context?.System?.person?.personId || handlerInput.requestEnvelope?.context?.System?.user?.userId;
    const now = new Date();
    const sk = now.toISOString();

    const entry = {
      "TableName": tableName,
      "Item": {
        "pk": {"S": pk},
        "sk": {"S": sk},
        "Weight": {"N": "2"},
        "message":{"S": "frank was here"}
      },
      "XRaySegment": ss
    };
    ss.addMetadata('ddbEntry', JSON.stringify(entry));
    ddb = AWSXRay.captureAWSClient(new AWS.DynamoDB({
      apiVersion: "2012-08-10",
      sslEnabled: false,
      paramValidation: false,
      convertResponseTypes: false
    }), ss);

    ddb.putItem(entry, function (err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        console.log("Success", data);
      }
    });

//    ddb.listTables({}, function(err, data) {
//      if (err) console.log(err, err.stack); // an error occurred
//      else     console.log(data);           // successful response
//    });

    const keys = Object.keys(Bookmarks)
    const destinations = keys.length > 1
      ? keys.slice(0, -1).join(", ") + ", and " + keys.slice(-1)
      : keys[0];

    const speechText = `Your bookmarked places are ${destinations}`;
    ss.addMetadata('speechText', speechText);

    const handlerResponse = handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard("My Bookmarked Locations", destinations)
      .withShouldEndSession(true)
      .getResponse();

    ss.close();
    return handlerResponse;
  }
};

// Get Route Intent Handler
const GetRoute = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "GetRoute"
      );
  },
  // It will be an asynchronous function
  async handle(handlerInput) {
    const ss = segment.addNewSubsegment('GetRoute');
    ss.addMetadata('requestEnvelope', JSON.stringify(handlerInput.requestEnvelope));
    ss.addAnnotation('requestType', Alexa.getRequestType(handlerInput.requestEnvelope) );

    // The slot information
    let slotdata = handlerInput.requestEnvelope.request.intent.slots;
    console.log("Slot Values --> " + JSON.stringify(slotdata));

    let speechText = "";

    // destination address - can be the bookmark's coordinates or a postal address
    let destination = "";

    // what alexa sould speak out once a destination is provided
    let speakdestination = "";

   // The slot value
   let slot = "";

   // Get the "destination" from the "slot value"
   if (slotdata.destination.value) {
     slot = slotdata.destination.value.toLowerCase();
     console.log("Destination Slot was detected. The value is " + slot);
   }

   // First try to get the value from bookmarks
   if (Bookmarks[slot]) {
     destination = Bookmarks[slot];
     speakdestination = slot.replace("my ", "your ");
   } else {
     destination = slot;
     speakdestination = destination;
   }
   ss.addAnnotation('destination', destination);

   // If there is no destination available, ask for the destination
   if (destination === "") {
     console.log("Destination is blank");

     let speechText = "Where would you like to go today?";
     let repromptText = "Sorry, I did not receive any input. Do you want me to read out your bookmarked destinations?";

     handlerInput.attributesManager.setSessionAttributes({
       type: "bookmarks"
     });

     return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
   }

   console.log("Destination is not blank");

   // Prepare the final google API path
   // replacing XXXXXX (user_destination variable) with a url encoded version of the actual destination
   let final_api_path = google_api_path.replace(user_destination, encodeURIComponent(destination));

   // https "options"
   let options = {
     host: google_api_host,
     path: final_api_path,
     method: "GET",
     XRaySegment: ss
   };

   // Log the complete Google URL for your review / cloudwatch
   console.log("Google API Path --> https://" + google_api_host + final_api_path);

   try {
     let jsondata = await actions.getData(https, options);
     console.log(jsondata);

     // 1. Check the status first
     let status = jsondata.status;

     if (status == "OK") {

        // Get the duration in traffic from the json array
        let duration = jsondata.routes[0].legs[0].duration_in_traffic.text;

        // Google API returns "min" in response. Replace the "min" with "minute" (OPTIONAL)
        // duration = duration.replace("min","minute");

        // Get the value in seconds too so that you can do the time calculation
        let seconds = jsondata.routes[0].legs[0].duration_in_traffic.value;

        // Initialise a new date, add 300 seconds (5 minutes) to it,
        // to compensate for the delay it will take to get to your vehicle.
        // Then get the hour and the minute only, and not the complete date.
        let nd = new Date();
        let ld = new Date(nd.getTime() + (seconds + 300 )* 1000);
        //let timeinhhmm = ld.toLocaleTimeString("en-US", {
        //  hour: "2-digit",
        //  minute: "2-digit"
        //});

        let timeinhhmm = ld.toLocaleTimeString("en-US", {timeZone: 'US/Central', hour:'2-digit', minute: '2-digit'});
        // https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

        speechText = "It will take you " + duration + " to reach " + speakdestination + ". You will reach around " +
                     "<say-as interpret-as='time'>" + timeinhhmm + "</say-as> if you leave within 5 minutes";

      } else {
        speechText = "Sorry, I was not able to get traffic information for your destination " + speakdestination + ". Please try a different destination";
        ss.addError(speechText);
        ss.addErrorFlag();
      }
    } catch (error) {
      speechText = "Sorry, an error occurred getting data from Google. Please try again.";
      ss.addError(speechText);
      ss.addErrorFlag();
    }

    const handlerResponse = handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
    ss.close();
    return handlerResponse;
  }
};

const SessionEndedHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "SessionEndedRequest";
  },
  handle(handlerInput) {
    const ss = segment.addNewSubsegment('SessionEndedHandler');
    ss.addMetadata('requestEnvelope', JSON.stringify(handlerInput.requestEnvelope));
    ss.addAnnotation('requestType', Alexa.getRequestType(handlerInput.requestEnvelope) );
    const reason = handlerInput.requestEnvelope?.request?.reason;
    segment.addError(`${reason}`);

    ss.close();
  }
};

const UnhandledHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    const ss = segment.addNewSubsegment('UnhandledHandler');
    ss.addMetadata('requestEnvelope', JSON.stringify(handlerInput.requestEnvelope));
    ss.addError(error);
    ss.addErrorFlag();
    const handlerResponse = handlerInput.responseBuilder
      .speak(`Sorry, I can't understand.`)
      .getResponse();

    ss.close();
    TraceShutdown.process(handlerInput);
    return handlerResponse;
  }
};

// courtesy https://developer.amazon.com/en-US/blogs/alexa/post/0e2015e1-8be3-4513-94cb-da000c2c9db0/what-s-new-with-request-and-response-interceptors-in-the-alexa-skills-kit-sdk-for-node-j
const RequestLog = {
  process(handlerInput) {
    console.log("REQUEST ENVELOPE = " + JSON.stringify(handlerInput.requestEnvelope));
  }
};

const TraceStartup = {
  process(handlerInput) {
    // for reasons that are mysterious to me, the environment variables do get
    // set at the top of the module, with the exception of _X_AMZN_TRACE_ID,
    // which I need, and is available here.
    const traceId = process.env._X_AMZN_TRACE_ID;

    // It is also weird to me that I need to manually decompose
    // _X_AMZN_TRACE_ID in order to be able to hand it off to their library.
    const parts = traceId.split(';');

    const rootPart    = parts.find(part => part.startsWith('Root='));
    const parentPart  = parts.find(part => part.startsWith('Parent='));
    const lineagePart = parts.find(part => part.startsWith('Lineage='));

    const root    = rootPart    ? rootPart.split('=')[1]    : null;
    const parent  = parentPart  ? parentPart.split('=')[1]  : null;
    const lineage = lineagePart ? lineagePart.split('=')[1] : null;

    segment = new AWSXRay.Segment(process.env.SKILL_NAME, root, parent);

    segment.addAnnotation('_X_AMZN_TRACE_ID', traceId);
    segment.addAnnotation('traceLineage',lineage);
    segment.addAnnotation('sessionId', handlerInput?.requestEnvelope?.session?.sessionId)

    segment.addAnnotation('awsRequestId', handlerInput.context.awsRequestId);

    segment.addMetadata('env',     JSON.stringify(process.env));
    segment.addMetadata('context', JSON.stringify(handlerInput.context));
  }
}

const TraceShutdown = {
  process(handlerInput) {
    segment.close();
    segment.flush();
  }
}

// Register the handlers and make them ready for use in Lambda
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    AuthorQuote,
    GetBookmarks,
    TableName,
    HelpIntent,
    GetRoute,
    YesIntent,
    NoIntent,
    Fallback,
    SessionEndedHandler)
  .addErrorHandlers(UnhandledHandler)
//  .addRequestInterceptors(RequestLog)
  .addRequestInterceptors(TraceStartup)
  .addResponseInterceptors(TraceShutdown)
  .lambda();
