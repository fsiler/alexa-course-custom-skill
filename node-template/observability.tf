# I started with https://stackoverflow.com/a/75157142 and wound up just using the basic role, courtesy
# https://github.com/amancevice/terraform-aws-lambda-basic-execution-role/blob/d6985813d378e0f57e00be36649c3c77aad23258/main.tf#L28-L31
resource "aws_iam_role_policy_attachment" "basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.role_for_lambda.name
}

# https://gist.github.com/mdlavin/1b8fcc1b05932f6c105fb7c4ad34c204
resource "aws_iam_role_policy_attachment" "aws_xray_write_only_access" {
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
  role       = aws_iam_role.role_for_lambda.name
}

resource "aws_cloudwatch_log_group" "lambda_log_group" {
  name              = "/aws/lambda/${local.config.hows_your_day.lambda.name}"
  retention_in_days = 7
  lifecycle {
    prevent_destroy = false
  }
}
