const { generateId, getServerlessSdk } = require('./utils')
const axios = require('axios')

// set enough timeout for deployment to finish
jest.setTimeout(600000)

// the yaml file we're testing against
const instanceYaml = {
  org: 'orgDemo',
  app: 'appDemo',
  component: 'cos',
  name: `cos-integration-tests-${generateId()}`,
  stage: 'dev',
  inputs: {
    region: 'ap-guangzhou',
    src: './example/files',
    targetDir: '/',
    website: false,
    bucket: 'my-bucket',
    protocol: 'https',
    acl: { permissions: 'public-read' }
  }
}

// get credentials from process.env but need to init empty credentials object
const credentials = {
  tencent: {}
}

// get serverless construct sdk
const sdk = getServerlessSdk(instanceYaml.org)

it('should successfully deploy cos service', async () => {
  const instance = await sdk.deploy(instanceYaml, { tencent: {} })

  expect(instance).toBeDefined()
  expect(instance.instanceName).toEqual(instanceYaml.name)
  expect(instance.environment).toEqual(instanceYaml.environment)
  expect(instance.outputs).toBeDefined()
  expect(instance.outputs.region).toEqual(instanceYaml.inputs.region)
  expect(instance.state).toBeDefined()
  expect(instance.state.acl).toBeDefined()
  expect(instance.state.acl.permissions).toEqual(instanceYaml.inputs.acl.permissions)
  expect(instance.state.protocol).toEqual(instanceYaml.inputs.protocol)
  expect(instance.state.srcOriginal).toEqual(instanceYaml.inputs.src)

  const response = await axios.get(`${instance.outputs.url}/index.html`)
  expect(response.data.includes('Serverless Framework')).toBeTruthy()
})

it('should successfully remove cos service', async () => {
  await sdk.remove(instanceYaml, credentials)
  result = await sdk.getInstance(
    instanceYaml.org,
    instanceYaml.stage,
    instanceYaml.app,
    instanceYaml.name
  )

  expect(result.instance.instanceStatus).toEqual('inactive')
})
