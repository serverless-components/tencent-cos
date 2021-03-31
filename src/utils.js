const CONFIGS = require('./config')

async function formatInputs(instance, inputs) {
  const appId = instance.getAppId()
  const bucket =
    inputs.bucket.indexOf(`-${appId}`) === -1 ? `${inputs.bucket}-${appId}` : inputs.bucket
  const formatedInputs = {
    force: true,
    replace: inputs.replace === true,
    bucket,
    protocol: inputs.protocol || 'https',
    keyPrefix: inputs.targetDir || '/'
  }
  let files = null
  if (inputs.src) {
    files = await instance.unzip(inputs.src)
  }

  if (inputs.acl) {
    formatedInputs.acl = {
      permissions: inputs.acl.permissions || 'private',
      grantRead: inputs.acl.grantRead || '',
      grantWrite: inputs.acl.grantWrite || '',
      grantFullControl: inputs.acl.grantFullControl || ''
    }
  }

  if (inputs.policy) {
    formatedInputs.policy = {
      Statement: inputs.policy,
      version: '2.0'
    }
  }

  if (inputs.website === true) {
    const websiteConfig = inputs.websiteConfig || {}
    formatedInputs.ignoreHtmlExt = websiteConfig.ignoreHtmlExt
    formatedInputs.disableErrorStatus = websiteConfig.disableErrorStatus

    formatedInputs.code = {
      src: files,
      index: websiteConfig.index || CONFIGS.indexPage,
      error: websiteConfig.error || CONFIGS.errorPage
    }
  } else {
    formatedInputs.src = files
  }

  // upload to target directory
  return formatedInputs
}

module.exports = {
  formatInputs
}
