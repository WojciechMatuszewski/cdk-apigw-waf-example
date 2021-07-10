import * as cdk from "@aws-cdk/core";
import * as apigw from "@aws-cdk/aws-apigatewayv2";
import * as apigwIntegrations from "@aws-cdk/aws-apigatewayv2-integrations";
import * as lambda from "@aws-cdk/aws-lambda";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as cloudfrontOrigins from "@aws-cdk/aws-cloudfront-origins";
import * as waf from "@aws-cdk/aws-wafv2";

export class HttpApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const webACL = new waf.CfnWebACL(this, "httpAPIWebACL", {
      defaultAction: { block: {} },
      scope: "CLOUDFRONT",
      visibilityConfig: {
        metricName: "httpAPI",
        cloudWatchMetricsEnabled: true,
        sampledRequestsEnabled: true
      },
      rules: [
        {
          name: "AllowWithHeader",
          priority: 0,
          statement: {
            byteMatchStatement: {
              fieldToMatch: {
                singleHeader: {
                  name: `x-myorigin`
                }
              },
              textTransformations: [
                {
                  priority: 0,
                  type: "NONE"
                }
              ],
              positionalConstraint: "EXACTLY",
              searchString: "test"
            }
          },
          action: { allow: {} },
          visibilityConfig: {
            metricName: "httpRule",
            cloudWatchMetricsEnabled: true,
            sampledRequestsEnabled: true
          }
        }
      ]
    });

    const helloLambda = new lambda.Function(this, "helloLambda", {
      code: lambda.Code.fromInline(
        `module.exports.handler = function handler() {
          return {
            statusCode: 200,
            body: 'it works'
          }
        }`
      ),
      // The inline code is put inside the `index.js` file.
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_12_X
    });

    const api = new apigw.HttpApi(this, "httpAPI");
    api.addRoutes({
      path: "/",
      integration: new apigwIntegrations.LambdaProxyIntegration({
        handler: helloLambda
      })
    });

    const distribution = new cloudfront.Distribution(this, "apiDistribution", {
      defaultBehavior: {
        origin: new cloudfrontOrigins.HttpOrigin(
          `${api.apiId}.execute-api.${cdk.Aws.REGION}.amazonaws.com`
          // You most likely want to add the header here just like in the REST API example
        ),
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED
      },
      webAclId: webACL.attrArn
    });

    new cdk.CfnOutput(this, "apiEndpoint", {
      value: api.apiEndpoint
    });

    new cdk.CfnOutput(this, "distributionEndpoint", {
      value: `https://${distribution.domainName}`
    });
  }
}
