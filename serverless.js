const { Component } = require('@serverless/core')
const util = require('util')
const COS = require('cos-nodejs-sdk-v5')

// because the Tencent SDK does not yet support promises
// I've created a helpful method that returns a promised client
// for the methods needed for this component
const getSdk = (credentials) => {
  const methods = ['putBucket']

  var cos = new COS(credentials)

  return methods.reduce((accum, method) => {
    accum[method] = util.promisify(cos[method])
    return accum
  }, {})
}

// Check whether a replace is required.
// In this case, we should replace
// if the Bucket or Region inputs changed
const shouldReplace = (inputs, state) => {
  if (inputs.Bucket !== state.Bucket || inputs.Region !== state.Region) {
    return true
  }
  return false
}

// Create a new component by extending the Component Class
class TencentCOS extends Component {
  async default(inputs = {}) {
    // Since this is a low level component, I think it's best to surface
    // all service API inputs as is to avoid confusion and enable all features of the service
    const { Bucket, Region, ACL, GrantRead, GrantWrite, GrantFullControl } = inputs

    const sdk = getSdk(this.context.credentials.tencent)

    // check if replace is required
    if (shouldReplace(inputs, this.state)) {
      // it's helpful to provide debug statements for every step of the deployment
      this.this.context.debug(`"Bucket" or "Region" inputs changed. Replacing.`)

      // the first step of replacing is to remove
      // the old bucket using data in the state
      await this.remove()
    }

    const params = {
      Bucket,
      Region,
      ACL,
      GrantRead,
      GrantWrite,
      GrantFullControl
    }

    this.context.debug(`Deploying "${Bucket}" bucket in the "${Region}" region.`)
    await sdk.putBucket(params)
    this.context.debug(`"${Bucket}" bucket was successfully deployed to the "${Region}" region.`)

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
