data "mongodbatlas_roles_org_id" "terraform" {
}

resource "mongodbatlas_project" "cngrs" {
  name   = local.project_name
  org_id = data.mongodbatlas_roles_org_id.terraform.org_id

  limits {
    name = "atlas.project.deployment.clusters"
    value = 2
  }

  is_collect_database_specifics_statistics_enabled = true
  is_data_explorer_enabled                         = true
  is_extended_storage_sizes_enabled                = true
  is_performance_advisor_enabled                   = true
  is_realtime_performance_panel_enabled            = true
  is_schema_advisor_enabled                        = true
}

resource "mongodbatlas_serverless_instance" "cngrs" {
  project_id   = mongodbatlas_project.cngrs.id
  name         = local.project_name

  provider_settings_backing_provider_name = "AWS"
  provider_settings_provider_name = "SERVERLESS"
  provider_settings_region_name = replace(upper(var.aws_region),"-","_")
}

