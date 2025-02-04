data "aws_iam_policy_document" "lambda_dynamodb" {
  statement {
    effect = "Allow"

    resources = ["arn:aws:dynamodb:*:*:table/*"]

    actions = [
        "dynamodb:ListTables"
    ]
  }

  statement {

    effect = "Allow"

    resources = ["arn:aws:dynamodb:*:*:table/${local.config.hows_your_day.lambda.name}"]

    actions = [
        "dynamodb:BatchGetItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:BatchWriteItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem"
    ]
  }
}

resource "aws_iam_policy" "lambda_dynamodb" {
  name        = "${local.config.hows_your_day.lambda.name}-lambda_dynamodb"
//  description = "A test policy"
  policy      = data.aws_iam_policy_document.lambda_dynamodb.json
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb" {
  policy_arn = aws_iam_policy.lambda_dynamodb.arn
  role       = aws_iam_role.role_for_lambda.name
}

resource "aws_dynamodb_table" "dynamodb-table" {
  name           = local.config.hows_your_day.lambda.name
  billing_mode   = "PROVISIONED"
  read_capacity  = 10
  write_capacity = 10
  hash_key       = "pk"
  range_key      = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  ttl {
    attribute_name = "TimeToExist"
    enabled        = false
  }

//  global_secondary_index {
//    name               = "UserTitleIndex"
//    hash_key           = "UserId"
//    range_key          = "Name"
//    write_capacity     = 10
//    read_capacity      = 10
//    projection_type    = "KEYS_ONLY"  # Corrected projection_type
//    non_key_attributes = []
//  }

  tags = {
    Name        = local.config.hows_your_day.lambda.name
//    Environment = "Training"
  }
}
