const { Component } = require('@serverless/core')
const util = require('util')
const COS = require('cos-nodejs-sdk-v5')

// because the Tencent SDK does not yet support promises
// I've created a helpful method that returns a promised client
// for the methods needed for this component
const getSdk = ({ SecretId, SecretKey }) => {
  // console.log(credentials)
  const methods = [
    'putBucket',
    'deleteBucket',
    'putBucketAcl',
    'putBucketCors',
    'deleteBucketCors',
    'putBucketTagging',
    'deleteBucketTagging'
  ]

  var cos = new COS({ SecretId, SecretKey })

  return methods.reduce((accum, method) => {
    accum[method] = util.promisify(cos[method])
    return accum
  }, cos)
}

// Check whether a replace is required.
// In this case, we should replace
// if the Bucket or Region inputs changed
const shouldReplace = (inputs, state) => {
  const stateNotEmpty = Object.keys(state).length !== 0
  const bucketOrRegionChanged = inputs.bucket !== state.bucket || inputs.region !== state.region
  if (stateNotEmpty && bucketOrRegionChanged) {
    return true
  }
  return false
}

const deployBucket = async (sdk, inputs, state) => {
  const { bucket, region } = inputs

  try {
    await sdk.putBucket({
      Bucket: bucket,
      Region: region
    })
  } catch (e) {
    // if this is a redeploy of a previously deployed bucket
    // just move on. Otherwise throw an error
    if (e.error.Code !== 'BucketAlreadyExists' || inputs.bucket !== state.bucket) {
      throw e
    }
  }
}

const getCorsRules = (cors) => {
  return cors.map((corsRule) => ({
    ID: corsRule.id,
    MaxAgeSeconds: String(corsRule.maxAgeSeconds),
    AllowedMethods: corsRule.allowedMethods,
    AllowedOrigins: corsRule.allowedOrigins,
    AllowedHeaders: corsRule.allowedHeaders,
    ExposeHeaders: corsRule.exposeHeaders
  }))
}

const getTags = (tags) =>
  tags.map((tagObject) => ({
    Key: tagObject.key,
    Value: tagObject.value
  }))

// Create a new component by extending the Component Class
class TencentCOS extends Component {
  async default(inputs = {}) {
    if (!inputs.bucket.includes(this.context.credentials.tencent.AppId)) {
      inputs.bucket = `${inputs.bucket}-${this.context.credentials.tencent.AppId}`
    }

    const sdk = getSdk(this.context.credentials.tencent)

    // check if replace is required
    if (shouldReplace(inputs, this.state)) {
      // it's helpful to provide debug statements for every step of the deployment
      this.context.debug(`"bucket" or "region" inputs changed. Replacing.`)

      // the first step of replacing is to remove
      // the old bucket using data in the state
      await this.remove()
      // then we move on to create the new bucket
    }

    // Deploy the bucket
    this.context.debug(`Deploying "${inputs.bucket}" bucket in the "${inputs.region}" region.`)
    await deployBucket(sdk, inputs, this.state)
    this.context.debug(
      `"${inputs.bucket}" bucket was successfully deployed to the "${inputs.region}" region.`
    )

    // set bucket ACL config
    this.context.debug(
      `Setting ACL for "${inputs.bucket}" bucket in the "${inputs.region}" region.`
    )

    const params = {
      Bucket: inputs.bucket,
      Region: inputs.region,
      ACL: inputs.acl ? inputs.acl.permissions : undefined,
      GrantRead: inputs.acl ? inputs.acl.grantRead : undefined,
      GrantWrite: inputs.acl ? inputs.acl.grantWrite : undefined,
      GrantFullControl: inputs.acl ? inputs.acl.grantFullControl : undefined
    }

    await sdk.putBucketAcl(params)

    // If user set Cors Rules, update the bucket with those
    if (inputs.cors) {
      this.context.debug(
        `Setting CORS rules for "${inputs.bucket}" bucket in the "${inputs.region}" region.`
      )

      const putBucketCorsParams = {
        Bucket: inputs.bucket,
        Region: inputs.region,
        CORSRules: getCorsRules(inputs.cors)
      }

      await sdk.putBucketCors(putBucketCorsParams)
    } else {
      // otherwise, make sure the bucket doesn't have
      // any Cors rules to reflect what is defined in the config
      this.context.debug(
        `Ensuring no CORS are set for "${inputs.bucket}" bucket in the "${inputs.region}" region.`
      )
      const deleteBucketCorsParams = { Bucket: inputs.bucket, Region: inputs.region }
      await sdk.deleteBucketCors(deleteBucketCorsParams)
    }

    // If the user set Tags, update the bucket with those
    if (inputs.tags) {
      this.context.debug(
        `Setting Tags for "${inputs.bucket}" bucket in the "${inputs.regionn}" region.`
      )
      const putBucketTaggingParams = {
        Bucket: inputs.bucket,
        Region: inputs.region,
        Tags: getTags(inputs.tags)
      }
      await sdk.putBucketTagging(putBucketTaggingParams)
    } else {
      // otherwise, make sure the bucket doesn't have
      // any Tags to reflect what is defined in the config
      this.context.debug(
        `Ensuring no Tags are set for "${inputs.bucket}" bucket in the "${inputs.region}" region.`
      )
      const deleteBucketTaggingParams = { Bucket: inputs.bucket, Region: inputs.region }
      await sdk.deleteBucketTagging(deleteBucketTaggingParams)
    }

    // Save any state data required for the remove operation
    // or any other operation required after deployment.
    // We try not to rely on state too much since the provider API
    // is the source of truth about components/servcies state
    // But in this case, we wanna know what is the bucket the user
    // deployed so that we could safely remove it even if inputs changed
    this.state.bucket = inputs.bucket
    this.state.region = inputs.region
    await this.save()

    // return the outputs of the deployments
    // in this case, they're simply the same as inputs
    return inputs
  }

  async remove(inputs = {}) {
    // for removal, we use state data since the user could change or delete the inputs
    // if no data found in state, we try to remove whatever is in the inputs
    let Bucket = this.state.bucket || inputs.bucket
    const Region = this.state.region || inputs.region

    // nothing to be done if there's nothing to remove
    if (!Bucket || !Region) {
      return {}
    }

    if (!Bucket.includes(this.context.credentials.tencent.AppId)) {
      Bucket = `${Bucket}-${this.context.credentials.tencent.AppId}`
    }

    const sdk = getSdk(this.context.credentials.tencent)

    const params = {
      Bucket,
      Region
    }

    try {
      this.context.debug(`Removing "${Bucket}" bucket from the "${Region}" region.`)
      await sdk.deleteBucket(params)
      this.context.debug(`"${Bucket}" bucket was successfully removed from the "${Region}" region.`)
    } catch (e) {
      // if the resource (ie. bucket) was already removed (maybe via the console)
      // just move on and clear the state to keep it in sync
      if (e.code !== 'NotFound') {
        // todo is that the correct error code?!
        throw e
      }
    }

    // after removal we clear the state to keep it in sync with the service API
    // this way if the user tried to deploy again, there would be nothing to remove
    this.state = {}
    await this.save()

    // might be helpful to output the Bucket that was removed
    return { Bucket, Region }
  }
}

// don't forget to export the new Componnet you created!
module.exports = TencentCOS
