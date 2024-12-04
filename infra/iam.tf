data "aws_iam_policy_document" "cngrs_bucket_policy" {
  statement {
    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = [
      "s3:GetObject"
    ]

    resources = [
      "${aws_s3_bucket.cngrs_bucket.arn}/*",
    ]
  }
}

data "aws_iam_policy_document" "cngrs_api_access_trust_policy" {
  statement {
    principals {
      type        = "Service"
      identifiers = ["build.apprunner.amazonaws.com"]
    }

    actions = [
      "sts:AssumeRole"
    ]
  }
}

resource "aws_iam_policy" "cngrs_api_access_policy" {
  name        = "cngrs_api_access_policy"
  path        = "/"
  description = "CNGRS API Policy for App Runner"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:DescribeImages",
          "ecr:GetAuthorizationToken",
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role" "cngrs_api_access_role" {
  name = "cngrs_api_access_role"

  assume_role_policy  = data.aws_iam_policy_document.cngrs_api_access_trust_policy.json
  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "cngrs_api_access_role_attachment" {
  role       = aws_iam_role.cngrs_api_access_role.name
  policy_arn = aws_iam_policy.cngrs_api_access_policy.arn
}

data "aws_iam_policy_document" "cngrs_api_instance_trust_policy" {
  statement {
    principals {
      type        = "Service"
      identifiers = ["tasks.apprunner.amazonaws.com"]
    }

    actions = [
      "sts:AssumeRole"
    ]
  }
}


resource "aws_iam_policy" "cngrs_api_instance_policy" {
  name        = "cngrs_api_instance_policy"
  path        = "/"
  description = "CNGRS API Policy to consume AWS APIs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Effect   = "Allow"
        Resource = "${aws_s3_bucket.cngrs_bucket.arn}/*"
      },
      {
        Action = [
          "ses:SendRawEmail"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Action = [
          "secretsmanager:GetSecretValue",
        ]
        Effect = "Allow"
        Resource = [
          aws_secretsmanager_secret.db_string.arn,
          aws_secretsmanager_secret.jwt_secret.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role" "cngrs_api_instance_role" {
  name = "cngrs_api_instance_role"
  assume_role_policy  = data.aws_iam_policy_document.cngrs_api_instance_trust_policy.json
  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "cngrs_api_instance_role_attachment" {
  role       = aws_iam_role.cngrs_api_instance_role.name
  policy_arn = aws_iam_policy.cngrs_api_instance_policy.arn
}

resource "aws_iam_policy" "gh_actions_runners_policy" {
  name        = "gh_actions_runers_policy"
  path        = "/"
  description = "GHA Runners Policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ecr:CompleteLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:InitiateLayerUpload",
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage"
        ]
        Effect   = "Allow"
        Resource = "${aws_ecr_repository.cngrs.arn}"
      },
      {
        Action   = "ecr:GetAuthorizationToken"
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Action = [
          "apprunner:ListServices",
          "apprunner:PauseService",
          "apprunner:ResumeService",
          "apprunner:StartDeployment"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_user" "gh_actions_runners" {
  name = "gha_runners"
  path = "/"

  tags = local.tags
}

resource "aws_iam_user_policy_attachment" "test-attach" {
  user       = aws_iam_user.gh_actions_runners.name
  policy_arn = aws_iam_policy.gh_actions_runners_policy.arn
}
