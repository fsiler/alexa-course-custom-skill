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
        "Parameter1": {
          "value": {
            "key1": "value1"
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
