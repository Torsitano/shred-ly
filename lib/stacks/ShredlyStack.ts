import { Stack, StackProps } from 'aws-cdk-lib'
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager'
import { Distribution, OriginAccessIdentity, PriceClass, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront'
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins'
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53'
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets'
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3'
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment'
import { Construct } from 'constructs'
import { BuildConfig } from '../buildUtils'


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

        const originAccessIdentity = new OriginAccessIdentity( this, 'originAccessIdentity' )
        landingPageBucket.grantRead( originAccessIdentity )

        const webhookHostedZone = HostedZone.fromLookup( this, 'shredlyHostedZone', {
            domainName: 'shred-ly.com.'
        } )

        const landingPageCert = new Certificate( this, 'landingPageCert', {
            domainName: 'shred-ly.com',
            subjectAlternativeNames: [
                'www.shred-ly.com'
            ],
            validation: CertificateValidation.fromDns( webhookHostedZone )
        } )

        const landingPageDistribution = new Distribution( this, 'landingPageDistribution', {
            defaultRootObject: 'index.html',
            defaultBehavior: {
                origin: new S3Origin( landingPageBucket, {
                    originAccessIdentity
                } ),
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


        new ARecord( this, 'shredlyLandingPage', {
            zone: webhookHostedZone,
            target: RecordTarget.fromAlias( new CloudFrontTarget( landingPageDistribution ) )
        } )



    }
}
