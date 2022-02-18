import { spawnSync } from 'child_process'
import {
  Stack,
  StackProps,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_lambda as lambda,
  aws_s3 as s3,
  aws_s3_deployment as s3deployment,
  DockerImage,
  CfnOutput,
  RemovalPolicy,
} from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { CorsHttpMethod, HttpApi } from '@aws-cdk/aws-apigatewayv2-alpha'
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha'

export class S3DataExampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const bucket = new s3.Bucket(this, 'Bucket', {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    })
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new origins.S3Origin(bucket),
      },
    })

    const api = new HttpApi(this, 'HttpApi', {
      corsPreflight: {
        allowOrigins: [`https://${distribution.domainName}`],
        allowMethods: [CorsHttpMethod.HEAD, CorsHttpMethod.GET],
      },
    })
    const helloFunction = new lambda.Function(this, 'HelloFunction', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(
        'exports.handler = async () => "Hello! I am lambda function!"'
      ),
    })
    api.addRoutes({
      path: '/hello',
      integration: new HttpLambdaIntegration('HelloIntegration', helloFunction),
    })

    new s3deployment.BucketDeployment(this, 'BucketDeployment', {
      destinationBucket: bucket,
      distribution,
      sources: [
        s3deployment.Source.jsonData('/config.json', {
          endpoint: api.url,
        }),
        s3deployment.Source.asset('./', {
          bundling: {
            image: DockerImage.fromRegistry('node:16'),
            local: {
              tryBundle: (outputDir: string) => {
                spawnSync('yarn', ['generate'], {
                  stdio: 'inherit',
                })
                spawnSync('mv', ['-f', '.output/public/*', outputDir], {
                  stdio: 'inherit',
                  shell: true,
                })
                return true
              },
            },
          },
        }),
      ],
    })

    new CfnOutput(this, 'URL', {
      value: `https://${distribution.domainName}`,
    })
  }
}
