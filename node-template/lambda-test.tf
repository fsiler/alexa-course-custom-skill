resource "aws_schemas_registry" "alexa_lambda_test_registry" {
  name        = "lambda-testevent-schemas"
  description = "Lambda Test Events"
}

# concept courtesy https://www.tecracer.com/blog/2022/08/prepopulate-lambda-console-testevents-without-dirty-manual-work-using-terraform.html
resource "aws_schemas_schema" "alexa_lambda_test" {
  name          = "_${local.config.hows_your_day.lambda.name}-schema"
  registry_name = "lambda-testevent-schemas"
  type          = "OpenApi3"
  description   = "console tests test"

  content = jsonencode({
    "openapi": "3.0.0",
    "info": {
      "version": "1.0.0",
      "title": "Event"
    },
    "paths": {},
    "components": {
      "schemas": {
        "Event": {
          "type": "object",
          "required": [
            "key1"
          ],
          "properties": {
            "key1": {
              "type": "string"
            }
          }
        }
      },
      "examples": {
        "TimeToAirport": {
          "value": {
            "version": "1.0",
            "session": {
              "new": false,
              "sessionId": "amzn1.echo-api.session.123456789012",
              "application": {
                "applicationId": "amzn1.ask.skill.987654321"
              },
              "attributes": {},
              "user": {
                "userId": "amzn1.ask.account.testUser"
              }
            },
            "context": {
              "AudioPlayer": {
                "playerActivity": "IDLE"
              },
              "System": {
                "application": {
                  "applicationId": "amzn1.ask.skill.987654321"
                },
                "user": {
                  "userId": "amzn1.ask.account.testUser"
                },
                "device": {
                  "supportedInterfaces": {
                    "AudioPlayer": {}
                  }
                }
              }
            },
            "request": {
              "type": "IntentRequest",
              "requestId": "amzn1.echo-api.request.1234",
              "timestamp": "2016-10-27T21:06:28Z",
              "locale": "en-US",
              "intent": {
                "name": "GetRoute",
                "slots": {
                  "destination": {
                     "value": "the airport"
                  }
                }
              }
            }
          }
        },
        "Parameter2": {
          "value": {
            "key1": "value2"
          }
        }
      }
    }
  })
}
