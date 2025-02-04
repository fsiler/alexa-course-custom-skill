const Alexa   = require("ask-sdk-core");
const AWS     = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');
//AWSXRay.captureAWS(require('aws-sdk'));  # Lots of overhead if you do this.
AWSXRay.enableManualMode();

var ddb;

var segment;

const actions = require("./functions");

const user_origin = "38.6774017,-90.3959057";
const Bookmarks = {
  "my parents": "38.8052151,-90.5672943",
  "my in laws": "38.6082336,-90.5332682",
  "the airport": "38.7505605,-90.3814042"
};
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
    const ss = segment.addNewSubsegment('LauchRequestHandler');
    ss.addMetadata('requestEnvelope', JSON.stringify(handlerInput.requestEnvelope));
    ss.addAnnotation('handler', 'launchHandler');
    ss.addAnnotation('requestType', Alexa.getRequestType(handlerInput.requestEnvelope) );

    const speechText = `Hi I am ${process.env.SKILL_NAME}, your cloud based personal assistant.`;
    const repromptText = "Sorry, I didn't catch that.  Do you need help?";

    ss.addMetadata('quote', speechText);

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
      .speak(`Sorry, I can't understand.  Do you need help?`)
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
  .addRequestHandlers(LaunchRequestHandler, AuthorQuote, GetBookmarks, TableName)
  .addErrorHandlers(UnhandledHandler)
//  .addRequestInterceptors(RequestLog)
  .addRequestInterceptors(TraceStartup)
  .addResponseInterceptors(TraceShutdown)
  .lambda();
