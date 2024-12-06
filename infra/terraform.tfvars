aws_account       = "034362034215"
aws_region        = "us-west-2"
domain_name       = "jidi.com.mx"
cngrs_bucket_name = "cngrs"
cngrs_api_cpu     = 256
cngrs_api_memory  = 512
cngrs_api_env_vars = {
  NODE_ENV             = "production"
  CORS_ORIGIN          = "https://cngrs.jidi.com.mx"
  SERVER_PORT          = 8080
  LOG_LEVEL            = "debug"
  AUDIT                = true
  JWT_EXPIRES_IN       = "1d"
  UPLOAD_TEMP_FILE_DIR = "/tmp"
}
cngrs_api_domain_name = "api.cngrs.jidi.com.mx"
