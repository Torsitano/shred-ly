import { Stack, StackProps } from 'aws-cdk-lib'
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager'
import { CfnDistribution, CfnOriginAccessControl, Distribution, PriceClass, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront'
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins'
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53'
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets'
import { BlockPublicAccess, Bucket, CfnBucketPolicy } from 'aws-cdk-lib/aws-s3'
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment'
import { Construct } from 'constructs'
import { BuildConfig } from '../buildUtils'
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam'


export class ShredlyStack extends Stack {
    //@ts-ignore
    constructor ( scope: Construct, id: string, buildConfig: BuildConfig, props?: StackProps ) {
        super( scope, id, props )

        const landingPageBucket = new Bucket( this, 'landingPageBucket', {
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            bucketName: 'shred-ly.com'
        } )

        new BucketDeployment( this, 'uploadIndex', {
            destinationBucket: landingPageBucket,
            sources: [
                Source.asset( './src/landingPage' )
            ]
        } )

        const hostedZone = HostedZone.fromLookup( this, 'shredlyHostedZone', {
            domainName: 'shred-ly.com.'
        } )

        const landingPageCert = new Certificate( this, 'landingPageCert', {
            domainName: 'shred-ly.com',
            subjectAlternativeNames: [
                'www.shred-ly.com'
            ],
            validation: CertificateValidation.fromDns( hostedZone )
        } )

        const originAccessControl = new CfnOriginAccessControl( this, 'OriginAccessControl', {
            originAccessControlConfig: {
                name: 'shredly-origin',
                signingBehavior: 'always',
                signingProtocol: 'sigv4',
                originAccessControlOriginType: 's3'
            }
        } )

        const landingPageDistribution = new Distribution( this, 'landingPageDistribution', {
            defaultRootObject: 'index.html',
            defaultBehavior: {
                origin: new S3Origin( landingPageBucket ),
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS
            },
            domainNames: [
                'www.shred-ly.com',
                'shred-ly.com'
            ],
            certificate: landingPageCert,
            enableLogging: true,
            priceClass: PriceClass.PRICE_CLASS_100
        } )

        landingPageBucket.addToResourcePolicy( new PolicyStatement( {
            effect: Effect.ALLOW,
            actions: [ 's3:GetObject' ],
            resources: [ landingPageBucket.arnForObjects( '*' ) ],
            principals: [ new ServicePrincipal( 'cloudfront.amazonaws.com' ) ],
            conditions: {
                StringEquals: {
                    'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${landingPageDistribution.distributionId}`
                }
            }
        } ) )

        const cfnBucketPolicy = landingPageBucket.policy?.node.defaultChild as CfnBucketPolicy
        cfnBucketPolicy.addPropertyDeletionOverride( 'PolicyDocument.Statement.0' )

        const cfnDistribution = landingPageDistribution.node.defaultChild as CfnDistribution
        cfnDistribution.addPropertyOverride( 'DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity', '' )
        cfnDistribution.addPropertyOverride( 'DistributionConfig.Origins.0.OriginAccessControlId', originAccessControl.ref )


        new ARecord( this, 'shredlyLandingPage', {
            zone: hostedZone,
            target: RecordTarget.fromAlias( new CloudFrontTarget( landingPageDistribution ) )
        } )



    }
}
