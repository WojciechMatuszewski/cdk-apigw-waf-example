import * as cdk from "@aws-cdk/core";
import * as apigw from "@aws-cdk/aws-apigateway";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as cloudfrontOrigins from "@aws-cdk/aws-cloudfront-origins";
import * as waf from "@aws-cdk/aws-wafregional";
import { PassthroughBehavior } from "@aws-cdk/aws-apigateway";

export class RestApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lookupHeaderMatchSet = new waf.CfnByteMatchSet(this, "lookupHeader", {
      name: "lookupHeader",
      byteMatchTuples: [
        {
          fieldToMatch: {
            type: "HEADER",
            data: "X-MyOrigin"
          },
          targetString: "text",
          textTransformation: "NONE",
          positionalConstraint: "EXACTLY"
        }
      ]
    });

    const headerRule = new waf.CfnRule(this, "restAPIRule", {
      metricName: "restAPI",
      name: "blockWithoutSecretHeader",
      predicates: [
        {
          dataId: lookupHeaderMatchSet.ref,
          type: "ByteMatch",
          negated: false
        }
      ]
    });

    const webACL = new waf.CfnWebACL(this, "restAPIWebACL", {
      defaultAction: { type: "BLOCK" },
      name: "myWebACL",
      metricName: "restAPI",
      rules: [
        {
          action: { type: "ALLOW" },
          priority: 1,
          ruleId: headerRule.ref
        }
      ]
    });

    const api = new apigw.RestApi(this, "restAPI", {});
    const integration = new apigw.MockIntegration({
      passthroughBehavior: PassthroughBehavior.NEVER,
      requestTemplates: {
        "application/json": JSON.stringify({ statusCode: 200 })
      },
      integrationResponses: [
        {
          statusCode: "200",
          responseTemplates: {
            "application/json": JSON.stringify("Hi there!")
          }
        }
      ]
    });
    api.root.addMethod("GET", integration, {
      methodResponses: [{ statusCode: "200" }]
    });

    new waf.CfnWebACLAssociation(this, "restAPIAssociation", {
      resourceArn: `arn:aws:apigateway:${cdk.Aws.REGION}::/restapis/${api.restApiId}/stages/${api.deploymentStage.stageName}`,
      webAclId: webACL.ref
    });

    const distribution = new cloudfront.Distribution(this, "apiDistribution", {
      defaultBehavior: {
        origin: new cloudfrontOrigins.HttpOrigin(
          `${api.restApiId}.execute-api.${cdk.Aws.REGION}.amazonaws.com`,
          {
            customHeaders: {
              "x-myorigin": "text"
            },
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY
          }
        ),
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED
      },
      enabled: true
    });

    new cdk.CfnOutput(this, "restAPIEndpoint", {
      value: api.url
    });

    new cdk.CfnOutput(this, "CFEndpoint", {
      value: `https://${distribution.domainName}/prod/`
    });
  }
}
