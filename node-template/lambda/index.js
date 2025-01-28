// Include the Alexa SDK v2
const Alexa = require("ask-sdk-core");
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
    const speechText = "Hello, I am a sample template and Frank edited me again.";
    const repromptText = "Sorry, I didn't catch that.  You can say, tell me a random quote";

    // Speak out the speechText via Alexa
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  }
};

const RandomQuote = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "RandomQuote"
    );
  },
  handle(handlerInput) {
    const [author, quote] = actions.getQuote(Quotes)
    const speechText = `${author} said ${quote}`;

    const cardTitle = `Quotation from ${author}`;
    const cardContent = quote;
    // Speak out the speechText via Alexa
    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard(cardTitle, cardContent)
      .withShouldEndSession(true)
      .getResponse();
  }
};

const AuthorQuote = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AuthorQuote"
    );
  },
  handle(handlerInput) {
    const author = handlerInput.requestEnvelope.request.intent.slots.author.value;
    console.log(`AuthorQuote: ${author}`);
    const [, quote] = actions.getQuote(Quotes, author)
    const speechText = `${author} said ${quote}`;

    const cardTitle = `Quotation from ${author}`;
    const cardContent = quote;
    // Speak out the speechText via Alexa
    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard(cardTitle, cardContent)
      .withShouldEndSession(true)
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
  .addRequestHandlers(LaunchRequestHandler, RandomQuote, AuthorQuote)
  .addRequestInterceptors(RequestLog)
  .lambda();
