#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { ShredlyStack } from './stacks/ShredlyStack'
import { getBuildConfig } from './buildUtils'

const app = new cdk.App()

const buildConfig = getBuildConfig( app )
console.log( 'Building with the following parameters: \n', buildConfig )


new ShredlyStack( app, 'ShredlyStack', buildConfig, {
    env: {
        account: buildConfig.awsAccountId,
        region: buildConfig.region
    }
} )


