const { Component } = require('@serverless/core')
const TencentLogin = require('tencent-login')
const util = require('util')
const klawSync = require('klaw-sync')
const path = require('path')
const fs = require('fs')
const COS = require('cos-nodejs-sdk-v5')
const { utils } = require('@serverless/core')
const tencentcloud = require('tencentcloud-sdk-nodejs')
const ClientProfile = require('tencentcloud-sdk-nodejs/tencentcloud/common/profile/client_profile.js')
const HttpProfile = require('tencentcloud-sdk-nodejs/tencentcloud/common/profile/http_profile.js')
const AbstractModel = require('tencentcloud-sdk-nodejs/tencentcloud/common/abstract_model')
const AbstractClient = require('tencentcloud-sdk-nodejs/tencentcloud/common/abstract_client')

// because the Tencent SDK does not yet support promises
// I've created a helpful method that returns a promised client
// for the methods needed for this component
const getSdk = ({ SecretId, SecretKey, token, timestamp }) => {
  // console.log(credentials)
  const methods = [
    'putBucket',
    'getBucket',
    'deleteBucket',
    'putBucketAcl',
    'putBucketCors',
    'deleteBucketCors',
    'putBucketTagging',
    'deleteBucketTagging',
    'deleteMultipleObject'
  ]

  let cos
  if (!token) {
    cos = new COS({
      SecretId,
      SecretKey,
      UserAgent: 'ServerlessComponent'
    })
  } else {
    cos = new COS({
      getAuthorization: function(option, callback) {
        callback({
          TmpSecretId: SecretId,
          TmpSecretKey: SecretKey,
          UserAgent: 'ServerlessComponent',
          XCosSecurityToken: token,
          ExpiredTime: timestamp
        })
      }
    })
  }

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
    if (
      !(e.error.Code == 'BucketAlreadyExists' || e.error.Code == 'BucketAlreadyOwnedByYou') ||
      inputs.bucket !== state.bucket
    ) {
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

class GetUserAppIdResponse extends AbstractModel {
  constructor() {
    super()

    this.RequestId = null
  }

  deserialize(params) {
    if (!params) {
      return
    }
    this.AppId = 'RequestId' in params ? params.AppId : null
    this.RequestId = 'RequestId' in params ? params.RequestId : null
  }
}

class AppidClient extends AbstractClient {
  constructor(credential, region, profile) {
    super('cam.tencentcloudapi.com', '2019-01-16', credential, region, profile)
  }

  GetUserAppId(req, cb) {
    const resp = new GetUserAppIdResponse()
    this.request('GetUserAppId', req, resp, cb)
  }
}

// Create a new component by extending the Component Class
class TencentCOS extends Component {
  confirmEnding(sourceStr, targetStr) {
    targetStr = targetStr.toString()
    const start = sourceStr.length - targetStr.length
    const arr = sourceStr.substr(start, targetStr.length)
    if (arr == targetStr) {
      return true
    }
    return false
  }

  getAppid(credentials) {
    const secret_id = credentials.SecretId
    const secret_key = credentials.SecretKey
    const cred = credentials.token
      ? new tencentcloud.common.Credential(secret_id, secret_key, credentials.token)
      : new tencentcloud.common.Credential(secret_id, secret_key)
    const httpProfile = new HttpProfile()
    httpProfile.reqTimeout = 30
    const clientProfile = new ClientProfile('HmacSHA256', httpProfile)
    const cam = new AppidClient(cred, 'ap-guangzhou', clientProfile)
    const req = new GetUserAppIdResponse()
    const body = {}
    req.from_json_string(JSON.stringify(body))
    const handler = util.promisify(cam.GetUserAppId.bind(cam))
    try {
      return handler(req)
    } catch (e) {
      throw 'Get Appid failed! '
    }
  }

  async doLogin() {
    const login = new TencentLogin()
    const tencent_credentials = await login.login()
    if (tencent_credentials) {
      tencent_credentials.timestamp = Date.now() / 1000
      try {
        const tencent = {
          SecretId: tencent_credentials.secret_id,
          SecretKey: tencent_credentials.secret_key,
          AppId: tencent_credentials.appid,
          token: tencent_credentials.token,
          expired: tencent_credentials.expired,
          signature: tencent_credentials.signature,
          uuid: tencent_credentials.uuid,
          timestamp: tencent_credentials.timestamp
        }
        await fs.writeFileSync('./.env_temp', JSON.stringify(tencent))
        return tencent
      } catch (e) {
        throw 'Error getting temporary key: ' + e
      }
    }
  }

  async sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  async getTempKey(temp) {
    const that = this

    if (temp) {
      while (true) {
        try {
          const tencent_credentials_read = JSON.parse(await fs.readFileSync('./.env_temp', 'utf8'))
          if (
            Date.now() / 1000 - tencent_credentials_read.timestamp <= 5 &&
            tencent_credentials_read.AppId
          ) {
            return tencent_credentials_read
          }
          await that.sleep(1000)
        } catch (e) {
          await that.sleep(1000)
        }
      }
    }

    try {
      const data = await fs.readFileSync('./.env_temp', 'utf8')
      try {
        const tencent = {}
        const tencent_credentials_read = JSON.parse(data)
        if (
          Date.now() / 1000 - tencent_credentials_read.timestamp <= 6000 &&
          tencent_credentials_read.AppId
        ) {
          return tencent_credentials_read
        }
        const login = new TencentLogin()
        const tencent_credentials_flush = await login.flush(
          tencent_credentials_read.uuid,
          tencent_credentials_read.expired,
          tencent_credentials_read.signature,
          tencent_credentials_read.AppId
        )
        if (tencent_credentials_flush) {
          tencent.SecretId = tencent_credentials_flush.secret_id
          tencent.SecretKey = tencent_credentials_flush.secret_key
          tencent.AppId = tencent_credentials_flush.appid
          tencent.token = tencent_credentials_flush.token
          tencent.expired = tencent_credentials_flush.expired
          tencent.signature = tencent_credentials_flush.signature
          tencent.uuid = tencent_credentials_read.uuid
          tencent.timestamp = Date.now() / 1000
          await fs.writeFileSync('./.env_temp', JSON.stringify(tencent))
          return tencent
        }
        return await that.doLogin()
      } catch (e) {
        return await that.doLogin()
      }
    } catch (e) {
      return await that.doLogin()
    }
  }

  async default(inputs = {}) {
    // Since this is a low level component, I think it's best to surface
    // all service API inputs as is to avoid confusion and enable all features of the service

    // login
    const temp = this.context.instance.state.status
    this.context.instance.state.status = true
    let { tencent } = this.context.credentials
    if (!tencent) {
      tencent = await this.getTempKey(temp)
      this.context.credentials.tencent = tencent
    }
    // get AppId
    if (!this.context.credentials.tencent.AppId) {
      const appId = await this.getAppid(this.context.credentials.tencent)
      this.context.credentials.tencent.AppId = appId.AppId
    }

    inputs.bucket = this.confirmEnding(inputs.bucket, this.context.credentials.tencent.AppId)
      ? inputs.bucket
      : inputs.bucket + '-' + this.context.credentials.tencent.AppId

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

    if (inputs.acl ? inputs.acl.permissions : undefined) {
      const params = {
        Bucket: inputs.bucket,
        Region: inputs.region,
        ACL: inputs.acl ? inputs.acl.permissions : undefined,
        GrantRead: inputs.acl ? inputs.acl.grantRead : undefined,
        GrantWrite: inputs.acl ? inputs.acl.grantWrite : undefined,
        GrantFullControl: inputs.acl ? inputs.acl.grantFullControl : undefined
      }

      await sdk.putBucketAcl(params)
    }

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
    // login
    const temp = this.context.instance.state.status
    this.context.instance.state.status = true
    let { tencent } = this.context.credentials
    if (!tencent) {
      tencent = await this.getTempKey(temp)
      this.context.credentials.tencent = tencent
    }
    // get AppId
    if (!this.context.credentials.tencent.AppId) {
      const appId = await this.getAppid(tencent)
      this.context.credentials.tencent.AppId = appId.AppId
    }

    let bucket = this.state.bucket || inputs.bucket
    const region = this.state.region || inputs.region

    // nothing to be done if there's nothing to remove
    if (!bucket || !region) {
      return {}
    }

    if (!bucket.includes(this.context.credentials.tencent.AppId)) {
      bucket = `${bucket}-${this.context.credentials.tencent.AppId}`
    }

    const sdk = getSdk(this.context.credentials.tencent)

    try {
      // if cos is not empty, must clean it first
      this.context.debug(`Removing files from the "${bucket}" bucket.`)
      // get file list
      const fileListResult = await sdk.getBucket({
        Bucket: bucket,
        Region: region
      })
      const fileList = new Array()
      if (fileListResult && fileListResult.Contents && fileListResult.Contents.length > 0) {
        // delete files
        for (let i = 0; i < fileListResult.Contents.length; i++) {
          fileList.push({
            Key: fileListResult.Contents[i].Key
          })
        }
        await sdk.deleteMultipleObject({
          Bucket: bucket,
          Region: region,
          Objects: fileList
        })
      }
    } catch (e) {
      throw e
    }

    try {
      this.context.debug(`Removing "${bucket}" bucket from the "${region}" region.`)
      await sdk.deleteBucket({
        Bucket: bucket,
        Region: region
      })
      this.context.debug(`"${bucket}" bucket was successfully removed from the "${region}" region.`)
    } catch (e) {
      // if the resource (ie. bucket) was already removed (maybe via the console)
      // just move on and clear the state to keep it in sync
      if (e.code !== 'NoSuchBucket') {
        throw e
      }
    }

    // after removal we clear the state to keep it in sync with the service API
    // this way if the user tried to deploy again, there would be nothing to remove
    this.state = {}
    await this.save()

    // might be helpful to output the Bucket that was removed
    return { bucket, region }
  }

  async upload(inputs = {}) {
    /*
			update file or dir
		 */

    // login
    const temp = this.context.instance.state.status
    this.context.instance.state.status = true
    let { tencent } = this.context.credentials
    if (!tencent) {
      tencent = await this.getTempKey(temp)
      this.context.credentials.tencent = tencent
    }
    // get AppId
    if (!this.context.credentials.tencent.AppId) {
      const appId = await this.getAppid(tencent)
      this.context.credentials.tencent.AppId = appId.AppId
    }

    const bucket = this.state.bucket || inputs.bucket
    const region = this.state.region || inputs.region || 'ap-guangzhou'

    if (!bucket) {
      throw Error('Unable to upload. Bucket name not found in state.')
    }

    this.context.debug(`Starting upload to bucket ${bucket} in region ${region}`)

    const clients = getSdk(this.context.credentials.tencent)

    if (inputs.dir && (await utils.dirExists(inputs.dir))) {
      this.context.debug(`Uploading directory ${inputs.dir} to bucket ${bucket}`)
      // upload directory contents

      const options = { keyPrefix: inputs.keyPrefix }

      const items = await new Promise((resolve, reject) => {
        try {
          resolve(klawSync(inputs.dir))
        } catch (error) {
          reject(error)
        }
      })

      let handler
      let key
      const uploadItems = []
      items.forEach((item) => {
        if (item.stats.isDirectory()) {
          return
        }

        key = path.relative(inputs.dir, item.path)

        if (options.keyPrefix) {
          key = path.posix.join(options.keyPrefix, key)
        }

        // convert backslashes to forward slashes on windows
        if (path.sep === '\\') {
          key = key.replace(/\\/g, '/')
        }

        const itemParams = {
          Bucket: bucket,
          Region: region,
          Key: key,
          Body: fs.createReadStream(item.path)
        }
        handler = util.promisify(clients.putObject.bind(clients))
        uploadItems.push(handler(itemParams))
      })

      await Promise.all(uploadItems)
    } else if (inputs.file && (await utils.fileExists(inputs.file))) {
      // upload a single file using multipart uploads
      this.context.debug(`Uploading file ${inputs.file} to bucket ${bucket}`)

      const itemParams = {
        Bucket: bucket,
        Region: region,
        Key: inputs.key || path.basename(inputs.file),
        Body: fs.createReadStream(inputs.file)
      }
      const handler = util.promisify(clients.putObject.bind(clients))
      try {
        await handler(itemParams)
      } catch (e) {
        throw e
      }

      this.context.debug(
        `File ${inputs.file} uploaded with key ${inputs.key || path.basename(inputs.file)}`
      )
    }
  }
}

// don't forget to export the new Componnet you created!
module.exports = TencentCOS
