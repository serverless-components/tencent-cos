const { Component } = require('@serverless/core')
const { Cos } = require('tencent-component-toolkit')
const { ApiTypeError } = require('tencent-component-toolkit/lib/utils/error')
const { formatInputs } = require('./utils')

class ServerlessComopnent extends Component {
  getCredentials() {
    const { tmpSecrets } = this.credentials.tencent

    if (!tmpSecrets || !tmpSecrets.TmpSecretId) {
      throw new ApiTypeError(
        'CREDENTIAL',
        'Cannot get secretId/Key, your account could be sub-account and does not have the access to use SLS_QcsRole, please make sure the role exists first, then visit https://cloud.tencent.com/document/product/1154/43006, follow the instructions to bind the role to your account.'
      )
    }

    return {
      SecretId: tmpSecrets.TmpSecretId,
      SecretKey: tmpSecrets.TmpSecretKey,
      Token: tmpSecrets.Token
    }
  }

  getAppId() {
    return this.credentials.tencent.tmpSecrets.appId
  }

  getDefaultProtocol(protocols) {
    if (String(protocols).includes('https')) {
      return 'https'
    }
    return 'http'
  }

  async getCosWebsite(cos, region, bucket) {
    return new Promise((resolve, reject) => {
      cos.cosClient.getBucketWebsite(
        {
          Bucket: bucket,
          Region: region
        },
        (err, info) => {
          if (err) {
            reject(err)
            return
          }

          resolve(info && info.WebsiteConfiguration)
        }
      )
    })
  }

  async deleteCosWebsite(cos, region, bucket) {
    return new Promise((resolve) => {
      cos.cosClient.deleteBucketWebsite(
        {
          Bucket: bucket,
          Region: region
        },
        (err) => {
          if (err) {
            console.log(err)
          }
          resolve(true)
        }
      )
    })
  }

  async deploy(inputs) {
    console.log(`Deploying COS...`)

    const credentials = this.getCredentials()
    const { region } = inputs
    const cos = new Cos(credentials, region)

    const deployInputs = await formatInputs(this, inputs)
    const { bucket, protocol } = deployInputs

    const outputs = {
      region,
      bucket,
      cosOrigin: `${bucket}.cos.${region}.myqcloud.com`
    }

    if (inputs.website === true) {
      const websiteUrl = await cos.website(deployInputs)
      outputs.website = `${this.getDefaultProtocol(protocol)}://${websiteUrl}`
      outputs.websiteOrigin = websiteUrl
    } else {
      try {
        // check website, if enable, disable it
        const websiteInfo = await this.getCosWebsite(cos, region, bucket)
        if (websiteInfo) {
          await this.deleteCosWebsite(cos, region, bucket)
        }
      } catch (e) {}

      await cos.deploy(deployInputs)
      outputs.url = `${this.getDefaultProtocol(protocol)}://${bucket}.cos.${region}.myqcloud.com`
    }

    this.state = {
      region,
      bucket
    }

    await this.save()

    return outputs
  }

  async remove() {
    console.log(`Removing COS...`)

    const { state } = this

    const credentials = this.getCredentials()
    const cos = new Cos(credentials, state.region)

    await cos.remove(state)

    this.state = {}
  }
}

module.exports = ServerlessComopnent
