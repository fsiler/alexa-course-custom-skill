const Alexa   = require("ask-sdk-core");
const AWSXRay = require('aws-xray-sdk-core');
AWSXRay.enableManualMode();
//AWSXRay.captureAWS(require('aws-sdk'));  # Lots of overhead if you do this.

const actions = require("./functions");

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
    const segment = new AWSXRay.Segment('LauchRequestHandler');
//    const mySubSegment = segment.getSugsegment('LauchRequestHandler');
//    mySubSegment.addAnnotation('handler', 'launchHandler');
//    mySubSegment.addAnnotation('requestType', Alexa.getRequestType(handlerInput.requestEnvelope) );
    segment.addAnnotation('requestType', Alexa.getRequestType(handlerInput.requestEnvelope) );

    const speechText = "Hello, I am a sample template and Frank edited me again.";
    const repromptText = "Sorry, I didn't catch that.  You can say, tell me a random quote";

//    mySubSegment.addMetadata('speakOutput', speechText);

    // Speak out the speechText via Alexa
    const handlerResponse = handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();

    segment.close(); segment.flush();
//    mySubSegment.close();
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
    const segment = new AWSXRay.Segment('AuthorQuote');
    segment.addAnnotation('requestType', Alexa.getRequestType(handlerInput.requestEnvelope) );

    const request = handlerInput.requestEnvelope.request;
    segment.addAnnotation('intent', request.intent.name);

    const authorCandidate = request.intent?.slots?.author?.value;
    segment.addAnnotation('authorCandidate', authorCandidate);

    const [responseAuthor, quote] = actions.getQuote(Quotes, authorCandidate)
    if (!responseAuthor) {
      return UnhandledHandler.handle(handlerInput);
    }

    const speechText = `${responseAuthor} said ${quote}`;
    segment.addAnnotation('responseAuthor', responseAuthor);

    const cardTitle = `Quotation from ${responseAuthor}`;
    const cardContent = quote;

    segment.addAnnotation('quote', quote);

    // Speak out the speechText via Alexa
    const handlerResponse = handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard(cardTitle, cardContent)
      .withShouldEndSession(true)
      .getResponse();
    segment.close(); segment.flush();

    return handlerResponse;
  }
};

const UnhandledHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error Handler: ${error}`);
    return handlerInput.responseBuilder
      .speak(`Sorry, I can't understand.  You can ask me to say a random quotation.`)
      .getResponse();
  }
};

const RequestLog = {
  process(handlerInput) {
    console.log("REQUEST ENVELOPE = " + JSON.stringify(handlerInput.requestEnvelope));
    return;
  }
};

// Register the handlers and make them ready for use in Lambda
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(LaunchRequestHandler, AuthorQuote)
  .addErrorHandlers(UnhandledHandler)
  .addRequestInterceptors(RequestLog)
  .lambda();
