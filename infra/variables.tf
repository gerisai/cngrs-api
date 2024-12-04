variable "aws_account" {
  type        = string
  description = "The AWS account to deploy resources to"
}

variable "aws_region" {
  type        = string
  description = "The AWS region to deploy resources to"
}

variable "domain_name" {
  type        = string
  description = "Route53 domain name for CNGRS API"
}

variable "cngrs_bucket_name" {
  type        = string
  description = "The name of the S3 Bucket for the CNGRS API"
}

variable "cngr_api_image_tag" {
  type        = string
  description = "Docker image tag to use for CNGRS API"
  default = "latest"
}

variable "cngrs_api_cpu" {
  type        = number
  description = "The CPU amount for CNGRS API task"
}

variable "cngrs_api_memory" {
  type        = number
  description = "The memory amount for CNGRS API task"
}

variable "cngrs_api_env_vars" {
  type = object({
    NODE_ENV             = string
    CORS_ORIGIN          = string
    OUT_MAIL             = string
    SERVER_PORT          = number
    LOG_LEVEL            = string
    AUDIT                = bool
    JWT_EXPIRES_IN       = string
    ENABLE_USER_MAIL     = bool
    ENABLE_PERSON_MAIL   = bool
    ENABLE_QR            = bool
    UPLOAD_TEMP_FILE_DIR = string
  })
}

variable "cngrs_api_domain_name" {
  type        = string
  description = "The custom domain name for CNGRS API"
}
