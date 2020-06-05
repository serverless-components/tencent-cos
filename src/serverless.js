const { Component } = require('@serverless/core')
const { Cos } = require('tencent-component-toolkit')
const util = require('util')
const CONFIGS = require('./config')

class ServerlessComopnent extends Component {
  getCredentials() {
    const { tmpSecrets } = this.credentials.tencent

    if (!tmpSecrets || !tmpSecrets.TmpSecretId) {
      throw new Error(
        'Cannot get secretId/Key, your account could be sub-account or does not have access, please check if SLS_QcsRole role exists in your account, and visit https://console.cloud.tencent.com/cam to bind this role to your account.'
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
    const getBucketWebsite = util.promisify(cos.cosClient.getBucketWebsite.bind(cos.cosClient))
    const info = await getBucketWebsite({
      Bucket: bucket,
      Region: region
    })
    return info && info.WebsiteConfiguration
  }

  async deleteCosWebsite(cos, region, bucket) {
    const deleteBucketWebsite = util.promisify(
      cos.cosClient.deleteBucketWebsite.bind(cos.cosClient)
    )
    try {
      await deleteBucketWebsite({
        Bucket: bucket,
        Region: region
      })
    } catch (e) {
      console.log(e)
    }
  }

  async deploy(inputs) {
    console.log(`Deploying COS...`)

    const credentials = this.getCredentials()
    const { region } = inputs
    const cos = new Cos(credentials, region)

    const files = await this.unzip(inputs.src)

    const appId = this.getAppId()

    inputs.bucket =
      inputs.bucket.indexOf(`-${appId}`) === -1 ? `${inputs.bucket}-${appId}` : inputs.bucket

    inputs.force = true

    if (inputs.acl) {
      inputs.acl = {
        permissions: inputs.acl.permissions || 'private',
        grantRead: inputs.acl.grantRead || '',
        grantWrite: inputs.acl.grantWrite || '',
        grantFullControl: inputs.acl.grantFullControl || ''
      }
    }

    // upload to target directory
    inputs.keyPrefix = inputs.targetDir || '/'

    const outputs = {
      region: region,
      bucket: inputs.bucket
    }
    if (inputs.website === true) {
      inputs.code = {
        src: files,
        index: inputs.indexPage || CONFIGS.indexPage,
        error: inputs.errorPage || CONFIGS.errorPage
      }
      const websiteUrl = await cos.website(inputs)
      outputs.website = `${this.getDefaultProtocol(inputs.protocol)}://${websiteUrl}`
    } else {
      try {
        // check website, if enable, disable it
        const websiteInfo = await this.getCosWebsite(cos, region, inputs.bucket)
        if (websiteInfo) {
          await this.deleteCosWebsite(cos, region, inputs.bucket)
        }
      } catch (e) {}

      inputs.src = files
      await cos.deploy(inputs)
      outputs.url = `${this.getDefaultProtocol(inputs.protocol)}://${
        inputs.bucket
      }.cos.${region}.myqcloud.com`
    }

    this.state = inputs
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
