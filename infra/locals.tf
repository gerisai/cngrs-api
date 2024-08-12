locals {
  project_name = "cngrs"
  app_name = "cngrs-api"
  netlify_subdomain = "cngrsweb.netlify.app"
  kms_key_id = "9a104692-77c7-4136-a0d8-8eaed3d52d9f"

  cngrs_api_validation_records = {for r in aws_apprunner_custom_domain_association.cngrs_api.certificate_validation_records:
    r.name => r.value
  }

  tags = {
    Environment = "Production"
    App         = "CNGRS"
  }
}
