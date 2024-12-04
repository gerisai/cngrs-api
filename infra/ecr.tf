resource "aws_ecr_repository" "cngrs-api" {
  name                 = "cngrs-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = false
  }
}
