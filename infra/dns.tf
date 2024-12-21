resource "aws_route53_zone" "jidi_dns_zone" {
  name = var.domain_name

  comment = "JIDI primary hosted zone"
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

resource "aws_route53_record" "amazonses_verification_record" {
  zone_id = aws_route53_zone.jidi_dns_zone.id
  name    = "_amazonses"
  type    = "TXT"
  ttl     = "600"
  records = [aws_ses_domain_identity.example.verification_token]
}

# GoDaddy mail configuration
resource "aws_route53_record" "godaddy_spf_record" {
  zone_id = aws_route53_zone.jidi_dns_zone.id
  name    = ""
  type    = "TXT"
  ttl     = "600"
  records = ["D7580420", "v=spf1 include:secureserver.net -all"]
}

resource "aws_route53_record" "godaddy_cname_records" {
  zone_id = aws_route53_zone.jidi_dns_zone.zone_id
  name    = "email"
  ttl     = 300
  type    = "CNAME"
  records = ["email.secureserver.net"]
}

resource "aws_route53_record" "godaddy_mx_record" {
  zone_id = aws_route53_zone.jidi_dns_zone.zone_id
  name    = ""
  ttl     = 300
  type    = "MX"
  records = ["0 smtp.secureserver.net", "10 mailstore1.secureserver.net"]
}

resource "aws_route53_record" "godaddy_srv_record" {
  zone_id = aws_route53_zone.jidi_dns_zone.zone_id
  name    = ""
  ttl     = 300
  type    = "SRV"
  records = ["100 1 443 autodiscover.secureserver.net"]
}
