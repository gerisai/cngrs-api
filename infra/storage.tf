resource "aws_s3_bucket" "cngrs_bucket" {
  bucket = var.cngrs_bucket_name

  tags = merge({
    Name = "cngrs"
  }, local.tags)
}

resource "aws_s3_bucket_ownership_controls" "cngrs_bucket_owner" {
  bucket = aws_s3_bucket.cngrs_bucket.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "cngrs_public_access_block" {
  bucket = aws_s3_bucket.cngrs_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "cngrs_allow_access_to_all" {
  bucket = aws_s3_bucket.cngrs_bucket.id
  policy = data.aws_iam_policy_document.cngrs_bucket_policy.json
}
