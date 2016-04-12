# Generators for lambda-tools

[![Circle CI](https://circleci.com/gh/Testlio/generator-lambda-tools.svg?style=svg&circle-token=63037fa0129cb7bbae3f9601aa6baaa2bebf582a)](https://circleci.com/gh/Testlio/generator-lambda-tools)

This repository contains [Yeoman](https://yeoman.io) generators for [lambda-tools](https://github.com/testlio/lambda-tools) package. The provided generators help set up a new service, as well as add functionality to an existing service.

## Installation

Make sure to have `yo` installed:

```bash
npm install -g yo
```

Then install the generators:

```bash
npm install generator-lambda-tools -g
```

## Generators

As with any Yeoman generator, the instructions given above are how to start the generator, which will guide you through the process by prompting for various answers. It is important to emphasise, that all of the subgenerators assume an existing service is in place (meaning a `cf.json` and `api.json` files already exist).

* [@testlio/lambda-tools](#serviceapp)
* [@testlio/lambda-tools:lambda](#lambda-function)
* [@testlio/lambda-tools:endpoint](#endpoint)
* [@testlio/lambda-tools:endpoint-response](#endpoint-response)
* [@testlio/lambda-tools:endpoint-cors](#cors)
* [@testlio/lambda-tools:dynamo-table](#dynamodb-tableindex)
* [@testlio/lambda-tools:dynamo-index](#dynamodb-tableindex)
* [@testlio/lambda-tools:dynamo-stream](#dynamodb-stream)

### Service/App

Setting up a new service is easy, just run the main generator. The generator will set up the main directory structure of the service, as well as setting up a yo config file. The generator creates stubs of `cf.json`, `api.json` and a directory called `lambdas`.

```bash
yo lambda-tools
```

The generator does assume that the npm package has already been set up via `npm init`. The generator will also, optionally, install dependencies to the current node package. Currently, the two dependencies that are offered are [@testlio/lambda-tools](https://github.com/testlio/lambda-tools) and [@testlio/lambda-foundation](https://github.com/testlio/lambda-foundation). If the first is installed, the service also configures an appropriate `start` script for the package (if one doesn't already exist).

### Lambda function

Not all Lambda functions need to be exposed via the API Gateway, creating such a Lambda function can be done by calling the `lambda` subgenerator:

```bash
yo lambda-tools:lambda
```

The generator creates a Lambda function in `<lambda name>/index.js` under the `lambdas` directory, along with `<lambda name>/event.json`, which can be used by lambda-tools via the `lambda execute` command in the newly created subdirectory.

### Endpoint

Adding an API Gateway endpoint that is backed by a Lambda function can be done via the `endpoint` subgenerator:

```bash
yo lambda-tools:endpoint
```

The endpoint generator supports all HTTP methods supported by API Gateway, as well as primitive mapping of integration headers to request headers to Lambda event properties.

Currently, the generator does not specifically support responses or their templates. These will need to be added manually as needed to `api.json` (default `200 OK` responses are added by default).

### Endpoint Response

Adding a new response (status code) to an endpoint in API Gateway can be done with the `endpoint-response` subgenerator:

```bash
yo @testlio/lambda-tools:endpoint-response
```

This generator offers adding a new response (such as a 404 or a 400) to an existing endpoint/HTTP method combination. The generator also covers response mapping templates and parameters (headers). The end result of the generator is a modified `api.json` file, with necessary lines added to support the new response type. These responses can be used by returning an error from the Lambda function, as currently API Gateway does not support multiple response types for successful responses.

### CORS

Once a path has been fully implemented with all of its HTTP methods/endpoints, you can add CORS support to it with the `endpoint-cors` generator.

```bash
yo @testlio/lambda-tools:endpoint-cors
```

The generator will make sure the path has the appropriate `OPTIONS` method defined as well as making sure all other methods/responses include suitable CORS headers.

_Note: Currently the `Access-Control-Allow-Headers` header is not optimised, meaning if there are headers that are unique to a specific method on a path, then the headers they have defined will be added to the CORS headers of all other methods on said path as well. Generally this is not a problem, but it may expose more headers than would be ideal._

### DynamoDB Table/Index

Services often include a DynamoDB table, which can be quickly set up using the `dynamo-table` subgenerator. The generator creates the appropriate entry into `cf.json`. Furthermore, there's also a `dynamo-index` subgenerator, which allows adding new global/local secondary indices to DynamoDB resources in the service.

Currently, the generator does not allow modifying the throughput options on the table or indices. The generator also assumes that the base `cf.json` was created via `yo lambda-tools`. Furthermore

```bash
yo lambda-tools:dynamo-table
yo lambda-tools:dynamo-index
```

### DynamoDB stream

DynamoDB tables expose a stream, which allows triggering Lambda functions when a change is conducted on the table (such as adding or removing a row). Enabling the stream and adding a Lambda function to handle the changes can be done via the `dynamo-stream` generator.

```bash
yo @testlio/lambda-tools:dynamo-stream
```

The generator will add an appropriate event source mapping to `cf.json`, as well as make sure that `lambda_policies.json` has appropriate policy set for the table.
