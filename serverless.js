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
  const bucketOrRegionChanged = inputs.Bucket !== state.Bucket || inputs.Region !== state.Region
  if (stateNotEmpty && bucketOrRegionChanged) {
    return true
  }
  return false
}

const deployBucket = async (sdk, inputs, state) => {
  const { Bucket, Region } = inputs

  try {
    await sdk.putBucket({
      Bucket,
      Region
    })
  } catch (e) {
    // if this is a redeploy of a previously deployed bucket
    // just move on. Otherwise throw an error
    if (e.error.Code !== 'BucketAlreadyExists' || inputs.Bucket !== state.Bucket) {
      throw e
    }
  }
}

// Create a new component by extending the Component Class
class TencentCOS extends Component {
  async default(inputs = {}) {
    // Since this is a low level component, I think it's best to surface
    // all service API inputs as is to avoid confusion and enable all features of the service
    const { Bucket, Region, ACL, CORS, Tags } = inputs

    const sdk = getSdk(this.context.credentials.tencent)

    // check if replace is required
    if (shouldReplace(inputs, this.state)) {
      // it's helpful to provide debug statements for every step of the deployment
      this.context.debug(`"Bucket" or "Region" inputs changed. Replacing.`)

      // the first step of replacing is to remove
      // the old bucket using data in the state
      await this.remove()
      // then we move on to create the new bucket
    }

    // Deploy the bucket
    this.context.debug(`Deploying "${Bucket}" bucket in the "${Region}" region.`)
    await deployBucket(sdk, inputs, this.state)
    this.context.debug(`"${Bucket}" bucket was successfully deployed to the "${Region}" region.`)

    // set bucket ACL config
    this.context.debug(`Setting ACL for "${Bucket}" bucket in the "${Region}" region.`)

    const params = {
      Bucket: inputs.Bucket,
      Region: inputs.Region,
      ACL: ACL ? inputs.ACL.Permissions : undefined,
      GrantRead: ACL ? inputs.ACL.GrantRead : undefined,
      GrantWrite: ACL ? inputs.ACL.GrantWrite : undefined,
      GrantFullControl: ACL ? inputs.ACL.GrantFullControl : undefined
    }

    await sdk.putBucketAcl(params)

    // If user set Cors Rules, update the bucket with those
    if (CORS) {
      this.context.debug(`Setting CORS rules for "${Bucket}" bucket in the "${Region}" region.`)

      const putBucketCorsParams2 = {
        Bucket,
        Region,
        CORSRules: CORS
      }

      await sdk.putBucketCors(putBucketCorsParams2)
    } else {
      // otherwise, make sure the bucket doesn't have
      // any Cors rules to reflect what is defined in the config
      this.context.debug(
        `Ensuring no CORS are set for "${Bucket}" bucket in the "${Region}" region.`
      )
      const deleteBucketCorsParams = { Bucket, Region }
      await sdk.deleteBucketCors(deleteBucketCorsParams)
    }

    // If the user set Tags, update the bucket with those
    if (Tags) {
      this.context.debug(`Setting Tags for "${Bucket}" bucket in the "${Region}" region.`)
      const putBucketTaggingParams = {
        Bucket,
        Region,
        Tags
      }
      await sdk.putBucketTagging(putBucketTaggingParams)
    } else {
      // otherwise, make sure the bucket doesn't have
      // any Tags to reflect what is defined in the config
      this.context.debug(
        `Ensuring no Tags are set for "${Bucket}" bucket in the "${Region}" region.`
      )
      const deleteBucketTaggingParams = { Bucket, Region }
      await sdk.deleteBucketTagging(deleteBucketTaggingParams)
    }

    // Save any state data required for the remove operation
    // or any other operation required after deployment.
    // We try not to rely on state too much since the provider API
    // is the source of truth about components/servcies state
    // But in this case, we wanna know what is the bucket the user
    // deployed so that we could safely remove it even if inputs changed
    this.state.Bucket = Bucket
    this.state.Region = Region
    await this.save()

    // return the outputs of the deployments
    // in this case, they're simply the same as inputs
    return inputs
  }

  async remove(inputs = {}) {
    // for removal, we use state data since the user could change or delete the inputs
    // if no data found in state, we try to remove whatever is in the inputs
    const Bucket = this.state.Bucket || inputs.Bucket
    const Region = this.state.Region || inputs.Region

    // nothing to be done if there's nothing to remove
    if (!Bucket || !Region) {
      return {}
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
