resource "aws_route53_zone" "jidi_dns_zone" {
  name = var.domain_name

  comment = "JIDI primary hosted zone"

  tags = local.tags
}

resource "aws_route53_record" "cngrs_web_cname_record" {
  zone_id = aws_route53_zone.jidi_dns_zone.zone_id
  name    = "cngrs"
  ttl     = 300
  type    = "CNAME"
  records = [local.netlify_subdomain]
}

resource "aws_route53_record" "cngrs_web_cname_record_www" {
  zone_id = aws_route53_zone.jidi_dns_zone.zone_id
  name    = "www.cngrs"
  ttl     = 300
  type    = "CNAME"
  records = [local.netlify_subdomain]
}

resource "aws_route53_record" "cngrs_api_cname" {
  zone_id = aws_route53_zone.jidi_dns_zone.zone_id
  name    = "api.cngrs"
  ttl     = 300
  type    = "CNAME"
  records = [aws_apprunner_service.cngrs_api.service_url]
}

resource "aws_route53_record" "cngrs_api_cname_validation" {
  zone_id  = aws_route53_zone.jidi_dns_zone.zone_id
  for_each = local.cngrs_api_validation_records
  name     = trimsuffix(each.key, ".jidi.com.mx.")
  ttl      = 300
  type     = "CNAME"
  records  = [each.value]
}

resource "aws_route53_record" "example_amazonses_verification_record" {
  zone_id = aws_route53_zone.jidi_dns_zone.id
  name    = "_amazonses"
  type    = "TXT"
  ttl     = "600"
  records = [aws_ses_domain_identity.example.verification_token]
}