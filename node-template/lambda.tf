data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "./lambda"
  output_path = "lambda_function_payload.zip"
}

resource "aws_lambda_function" "alexa_lambda" {
  depends_on     = [aws_cloudwatch_log_group.lambda_log_group]
  lifecycle {
    ignore_changes = [layers]
  }
  # If the file is not in the current working directory you will need to include a
  # path.module in the filename.

  filename       = "lambda_function_payload.zip"
  function_name  = local.config.hows_your_day.lambda.name
  role           = aws_iam_role.role_for_lambda.arn
  handler        = "index.handler"

  source_code_hash = data.archive_file.lambda.output_base64sha256

  runtime        = "nodejs22.x"
  architectures  = ["arm64"]

  environment {
    variables = {
      SKILL_NAME     = local.config.hows_your_day.skill_name
      GOOGLE_API_KEY = local.config.hows_your_day.google.api_key
    }
  }

  tracing_config {
    mode = "Active"
  }
}

output "alexa_lambda_arn" {
  value = resource.aws_lambda_function.alexa_lambda.arn
}

//output "alexa_lambda" {
//  value = resource.aws_lambda_function.alexa_lambda
//}

