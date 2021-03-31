const path = require('path')
const axios = require('axios')
const { generateId, getServerlessSdk } = require('./lib/utils')

const appId = process.env.TENCENT_APP_ID
const credentials = {
  tencent: {
    SecretId: process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.TENCENT_SECRET_KEY
  }
}

const instanceYaml = {
  org: 'orgDemo',
  app: 'appDemo',
  component: 'cos@dev',
  name: `cos-integration-tests-${generateId()}`,
  stage: 'dev',
  inputs: {
    src: {
      src: path.join(__dirname, '..', 'example/src'),
    },
    bucket: 'cos-integration-test',
    region: 'ap-guangzhou',
    acl: {
      permissions: 'public-read'
    }

  }
}

const sdk = getServerlessSdk(instanceYaml.org, appId)

describe('COS', () => {
  it('deploy cos', async () => {
    const instance = await sdk.deploy(instanceYaml, credentials)

    expect(instance).toBeDefined()
    expect(instance.instanceName).toEqual(instanceYaml.name)
    expect(instance.outputs.url).toBeDefined()
    expect(instance.outputs.region).toEqual(instanceYaml.inputs.region)
    // exist page
    const { data } = await axios.get(`${instance.outputs.url}/index.html`)
    expect(data).toContain('Serverless');
  })

  it('deploy website', async () => {
    instanceYaml.inputs.website = true
    const instance = await sdk.deploy(instanceYaml, credentials)

    expect(instance).toBeDefined()
    expect(instance.instanceName).toEqual(instanceYaml.name)
    expect(instance.outputs.website).toBeDefined()
    expect(instance.outputs.region).toEqual(instanceYaml.inputs.region)
    // exist page
    const { data } = await axios.get(instance.outputs.website)
    expect(data).toContain('Serverless');
  })

  it('remove success', async () => {
    await sdk.remove(instanceYaml, credentials)
    result = await sdk.getInstance(instanceYaml.org, instanceYaml.stage, instanceYaml.app, instanceYaml.name)

    expect(result.instance.instanceStatus).toEqual('inactive')
  })

})
