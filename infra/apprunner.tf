resource "aws_apprunner_auto_scaling_configuration_version" "cngrs_api" {
  auto_scaling_configuration_name = "cngrs-api"

  max_concurrency = 50
  max_size        = 10
  min_size        = 1
}

resource "aws_apprunner_service" "cngrs_api" {
  service_name                   = local.app_name
  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.cngrs_api.arn

  source_configuration {
    image_repository {
      image_configuration {
        port = var.cngrs_api_env_vars.SERVER_PORT
        runtime_environment_secrets = {
          DB_STRING  = aws_secretsmanager_secret.db_string.arn
          JWT_SECRET = aws_secretsmanager_secret.jwt_secret.arn
        }

        runtime_environment_variables = merge({
          AWS_REGION     = var.aws_region
          S3_BUCKET_NAME = var.cngrs_bucket_name
          SQS_URL        = data.aws_sqs_queue.cngrs_mail_queue.url
        }, var.cngrs_api_env_vars)
      }
      image_identifier      = "${aws_ecr_repository.cngrs-api.repository_url}:${var.cngr_api_image_tag}"
      image_repository_type = "ECR"
    }
    auto_deployments_enabled = false

    authentication_configuration {
      access_role_arn = aws_iam_role.cngrs_api_access_role.arn
    }
  }

  instance_configuration {
    cpu               = var.cngrs_api_cpu
    memory            = var.cngrs_api_memory
    instance_role_arn = aws_iam_role.cngrs_api_instance_role.arn
  }

  network_configuration {
    ingress_configuration {
      is_publicly_accessible = true
    }
  }
}

resource "aws_apprunner_custom_domain_association" "cngrs_api" {
  domain_name = var.cngrs_api_domain_name
  service_arn = aws_apprunner_service.cngrs_api.arn
}
