resource "aws_secretsmanager_secret" "db_string" {
  name        = "db_string"
  description = ""
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "jwt_secret"
}
