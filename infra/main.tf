terraform {
  required_version = ">= 1.9.1"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.57.0"
    }

    mongodbatlas = {
      source = "mongodb/mongodbatlas"
      version = "1.17.6"
    }
  }

  backend "s3" {
    bucket = "tf-state-st"
    key    = "jidi"
    region = "us-west-2"
  }
}

provider "aws" {
  region = "us-west-2"
  profile = "jidi"
}

provider "mongodbatlas" {}
