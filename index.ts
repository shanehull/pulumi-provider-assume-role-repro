import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const accountId = aws.getCallerIdentity({})
  .then(currentAwsIdentity => currentAwsIdentity.accountId)

const region = "us-east-1"
const name = "test-vpc-provider"

export const pulumiRole = new aws.iam.Role(`${name}-role`, {
  description: "Allow management of EC2:*",
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ AWS: accountId })
});

// Create role policy to allow management of EC2 
export const pulumiRolePolicy = new aws.iam.RolePolicy(`${name}-rolePolicy`, {
  role: pulumiRole,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "ec2:*",
        ],
        Resource: "*"
      }
    ]
  }
}, {
  dependsOn: pulumiRole,
});

// Create a provider and assume role
export const provider = new aws.Provider(`${region}-provider`, {
  region: region,
  assumeRole: {
    roleArn: pulumiRole.arn.apply(async (arn) => {
      await new Promise(resolve => setTimeout(resolve, 120 * 1000));
      return arn
    }),
    sessionName: "PulumiSession",
    externalId: "PulumiApplication",
  },
});


// Create a VPC
export const vpc = new awsx.ec2.Vpc(`${name}`, {
  cidrBlock: "10.0.0.0/16",
  numberOfAvailabilityZones: "all",
}, {
  provider: provider,
});

