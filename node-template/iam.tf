data "aws_iam_policy_document" "assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "role_for_lambda" {
  name               = "role_for_lambda"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

# courtesy https://github.com/hashicorp/terraform/issues/9893#issuecomment-308306013
# you will get a SkillManifestError if you don't have this
resource "aws_lambda_permission" "with_alexa" {
  statement_id  = "AllowExecutionFromAlexa"
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.alexa_lambda.function_name}"
  principal     = "alexa-appkit.amazon.com"

  event_source_token =  local.config.hows_your_day.skill.id
}
