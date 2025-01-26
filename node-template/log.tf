# courtesy https://github.com/amancevice/terraform-aws-lambda-basic-execution-role/blob/d6985813d378e0f57e00be36649c3c77aad23258/main.tf#L28-L31
resource "aws_iam_role_policy_attachment" "basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.role_for_lambda.name
}

resource "aws_cloudwatch_log_group" "lambda_log_group" {
  name              = "/aws/lambda/${var.lambda.function_name}"
  retention_in_days = 7
  lifecycle {
    prevent_destroy = false
  }
}
