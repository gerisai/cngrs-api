output "cngrs_api_validation_records" {
  value = aws_apprunner_custom_domain_association.cngrs_api.certificate_validation_records
}
