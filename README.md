# WAF with REST and HTTP APIGW

While I was reading about various AWS things, I encountered [this workshop page](https://wellarchitectedlabs.com/security/300_labs/300_multilayered_api_security_with_cognito_and_waf/2_use_secrets_securely/) and decided to play around with WAF.

This repo consist of 2 stacks.

- The `rest-api` one uses _WAF classic_ and the _REST_ flavour of APIGW.
- The `http-api` one uses _WAF v2_ and the _HTTP_ flavour of APIGW.

Here are the learnings and my notes.

## WAF with APIGW REST API

- Specifying correct `passthroughBehavior` is important for the `mock` integration.
  - The `NEVER` option means that if no mapping templates for this step were defined, the request will be rejected with 415 statusCode.
- I'm not actually sure what the `requestTemplate` is all about. If it's about the data transformation, why do I need to return a `statusCode` field from it??
  - At first I though that the `statusCode` is implied for any kind of VTL transformation, but that does not seem to be the case
  - I do not have any better explanation that this is a synthetic [requirement imposed by the AWS](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-mock-integration.html#how-to-mock-integration-request-examples)
- I have the same feelings towards the `methodResponse` parameter. I've already specified the response for the integration. Why would I need to specify an `{statusCode: "200"}` for that?

  - The apparent argument is that the `methodResponse` is the public interface that your `integrationResponse` has to satisfy.
    This is how [Alex explains it in his blog post about APIGW](https://www.alexdebrie.com/posts/api-gateway-elements/#defining-status-codes-in-method-responses)

- WAF _WebACL_ has to be of type _Regional_ to be used with APIGW. This applies to both the classic and the v2 version of the service.
  **The WAF of type _Regional_ cannot be attached to a _CloudFront_ distribution**.

- You attach the _WebACL_ to the stage of the API, not the whole API

- With the APIGW REST API + CloudFront, the WAF can be associated with either the API itself or the CloudFront distribution.
  Of course, nothing is stopping you from attaching the WAF to both of the services.

## WAF with APIGW HTTP API

- The _HTTP_ flavour of the APIGW does not natively support _WAF_, thus I've associated the _WebACL_ with the _CloudFront distribution_

- With WAF hooked up only to the _CloudFront distribution_ you will need to disable the default APIGW endpoint.
  I did not do this in this example.

- To attach the _WebACL_ to _CloudFront_ you will need to use the property on the _CloudFront_ resource rather than the _WebACLAssociation_ one.
