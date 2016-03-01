# Generators for lambda-tools

This repository contains [Yeoman](https://yeoman.io) generators for [@testlio/lambda-tools](https://github.com/testlio/lambda-tools) package. The provided generators help set up a new service, as well as add functionality to an existing service.

## Installation

Make sure to have `yo` installed:

```bash
npm install -g yo
```

Then install the generators:

```bash
npm install @testlio/generator-lambda-tools -g
```

## Generators

### Service/App

Setting up a new service is easy, just run the main generator. The generator will set up the main directory structure of the service, as well as setting up a yo config file. The generator creates stubs of `cf.json`, `api.json` and a directory called `lambdas`.

```bash
yo @testlio/lambda-tools
```

### Lambda function

Not all Lambda functions need to be exposed via the API Gateway, creating such a Lambda function can be done by calling the `lambda` subgenerator:

```bash
yo @testlio/lambda-tools:lambda
```

The generator creates a Lambda function in `<lambda name>/index.js` under the `lambdas` directory, along with an `<lambda name>/event.json`, which can be used by lambda-tools via the `lambda execute` command in the newly created subdirectory.

### Endpoint

Adding an API Gateway endpoint that is backed by a Lambda function can be done via the `endpoint` subgenerator:

```bash
yo @testlio/lambda-tools:endpoint
```

The endpoint generator supports all HTTP methods supported by API Gateway, as well as primitive mapping of integration headers to request headers to Lambda event properties.

Currently, the generator does not specifically support responses or their templates. These will need to be added manually as needed to `api.json` (default `200 OK` responses are added by default).

### DynamoDB Table/Index

Services often include a DynamoDB table, which can be quickly set up using the `dynamo-table` subgenerator. The generator creates the appropriate entry into `cf.json`. Furthermore, there's also a `dynamo-index` subgenerator, which allows adding new global/local secondary indices to DynamoDB resources in the service.

Currently, the generator does not allow modifying the throughput options on the table or indices. The generator also assumes that the base `cf.json` was created via `yo @testlio/lambda-tools`. Furthermore

```bash
yo @testlio/lambda-tools:dynamo-table
yo @testlio/lambda-tools:dynamo-index
```
